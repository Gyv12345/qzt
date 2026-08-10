package service

import (
	"context"
	"fmt"

	apprmodel "qzt-go-server/internal/model/approval"
	apprrepo "qzt-go-server/internal/repository/approval"
	"qzt-go-server/internal/repository"
)

// todo.go 审批待办服务。
// 待办列表 / 已办 / 我发起的 / 审批详情。
// 列表接口返回 enrichment 数据(含 resource_title / form_type_label),方便前端展示。

// formTypeLabel 表单类型中文映射。
var formTypeLabel = map[string]string{
	"CONTRACT":        "合同",
	"QUOTATION":       "报价单",
	"ORDER":           "订单",
	"INVOICE":         "发票",
	"PURCHASE_ORDER":  "采购单",
	"SALES_ORDER":     "销售单",
	"PURCHASE_RETURN": "采购退货",
	"SALES_RETURN":    "销售退货",
	"EXPENSE":         "报销单",
	"LEAVE":           "请假单",
	"TRIP":            "出差申请",
	"LOAN":            "借款单",
	"MEETING_BOOKING": "会议预订",
	"OA_CUSTOM":       "自定义表单",
}

// resourceTitleColumn 每种业务表的标题列名。
var resourceTitleColumn = map[string]string{
	"crm_contract":         "name",
	"crm_quotation":        "title",
	"crm_order":            "order_no",
	"fin_invoice":          "invoice_no",
	"psi_purchase_order":   "order_no",
	"psi_sales_order":      "order_no",
	"psi_purchase_return":  "return_no",
	"psi_sales_return":     "return_no",
	"oa_expense":           "title",
	"hrm_leave":            "reason",
	"oa_business_trip":     "title",
	"oa_loan":              "title",
	"oa_meeting_booking":   "topic",
	"oa_form_data":         "",
}

// enrichInstance 给实例附加 resource_title(从业务表查标题)。
type enrichedInstance struct {
	apprmodel.ApprovalInstance
	ResourceTitle string `json:"resource_title"`
	FormTypeLabel string `json:"form_type_label"`
}

// enrichTask 给任务附加 instance 信息 + resource_title。
type enrichedTask struct {
	apprmodel.ApprovalTask
	Instance       *enrichedInstance `json:"instance"`
}

// TodoService 审批待办服务。
type TodoService struct {
	taskRepo     *apprrepo.TaskRepo
	instanceRepo *apprrepo.InstanceRepo
	recordRepo   *apprrepo.RecordRepo
}

func NewTodoService() *TodoService {
	return &TodoService{
		taskRepo:     apprrepo.NewTaskRepo(),
		instanceRepo: apprrepo.NewInstanceRepo(),
		recordRepo:   apprrepo.NewRecordRepo(),
	}
}

// fetchResourceTitles 批量查资源标题。
// 传入 (formType, resourceID) 列表,返回 "formType:resourceID" → 标题 的 map。
func fetchResourceTitles(ctx context.Context, instances []apprmodel.ApprovalInstance) map[string]string {
	if len(instances) == 0 {
		return nil
	}
	// 按 form_type 分组,减少查询次数
	byType := make(map[string][]uint)
	for _, inst := range instances {
		byType[inst.Type] = append(byType[inst.Type], inst.ResourceID)
	}

	result := make(map[string]string)
	db := repository.DBFrom(ctx)
	for formType, ids := range byType {
		table, ok := apprmodel.FormTable[formType]
		if !ok || table == "" {
			continue
		}
		col, ok := resourceTitleColumn[table]
		if !ok || col == "" {
			continue
		}
		// 查标题
		var rows []struct {
			ID    uint   `gorm:"column:id"`
			Title string `gorm:"column:title"`
		}
		err := db.Table(table).
			Select(fmt.Sprintf("id, %s AS title", col)).
			Where("id IN ?", ids).
			Where("deleted_at IS NULL").
			Find(&rows).Error
		if err != nil {
			continue
		}
		for _, r := range rows {
			key := fmt.Sprintf("%s:%d", formType, r.ID)
			result[key] = r.Title
		}
	}
	return result
}

// ListTodo 待办列表(approverID + status=APPROVING)。
func (s *TodoService) ListTodo(ctx context.Context, page, pageSize int, userID uint) ([]enrichedTask, int64, error) {
	tasks, total, err := s.taskRepo.PageByApprover(ctx, page, pageSize, userID, apprmodel.TaskStatusApproving)
	if err != nil {
		return nil, total, err
	}
	if len(tasks) == 0 {
		return []enrichedTask{}, total, nil
	}

	// 收集 instance IDs,批量查实例
	instIDs := make([]uint, 0, len(tasks))
	for _, t := range tasks {
		if t.InstanceID > 0 {
			instIDs = append(instIDs, t.InstanceID)
		}
	}

	var instances []apprmodel.ApprovalInstance
	if len(instIDs) > 0 {
		repository.DBFrom(ctx).Where("id IN ?", instIDs).Find(&instances)
	}
	titleMap := fetchResourceTitles(ctx, instances)
	instMap := make(map[uint]*enrichedInstance, len(instances))
	for i := range instances {
		inst := &instances[i]
		key := fmt.Sprintf("%s:%d", inst.Type, inst.ResourceID)
		instMap[inst.ID] = &enrichedInstance{
			ApprovalInstance: *inst,
			ResourceTitle:    titleMap[key],
			FormTypeLabel:    formTypeLabel[inst.Type],
		}
	}

	out := make([]enrichedTask, 0, len(tasks))
	for _, t := range tasks {
		et := enrichedTask{ApprovalTask: t}
		if inst, ok := instMap[t.InstanceID]; ok {
			et.Instance = inst
		}
		out = append(out, et)
	}
	return out, total, nil
}

// ListProcessed 已办列表。
func (s *TodoService) ListProcessed(ctx context.Context, page, pageSize int, userID uint) ([]enrichedTask, int64, error) {
	tasks, total, err := s.taskRepo.PageByApprover(ctx, page, pageSize, userID, "")
	if err != nil {
		return nil, total, err
	}
	if len(tasks) == 0 {
		return []enrichedTask{}, total, nil
	}

	instIDs := make([]uint, 0, len(tasks))
	for _, t := range tasks {
		if t.InstanceID > 0 {
			instIDs = append(instIDs, t.InstanceID)
		}
	}
	var instances []apprmodel.ApprovalInstance
	if len(instIDs) > 0 {
		repository.DBFrom(ctx).Where("id IN ?", instIDs).Find(&instances)
	}
	titleMap := fetchResourceTitles(ctx, instances)
	instMap := make(map[uint]*enrichedInstance, len(instances))
	for i := range instances {
		inst := &instances[i]
		key := fmt.Sprintf("%s:%d", inst.Type, inst.ResourceID)
		instMap[inst.ID] = &enrichedInstance{
			ApprovalInstance: *inst,
			ResourceTitle:    titleMap[key],
			FormTypeLabel:    formTypeLabel[inst.Type],
		}
	}

	out := make([]enrichedTask, 0, len(tasks))
	for _, t := range tasks {
		et := enrichedTask{ApprovalTask: t}
		if inst, ok := instMap[t.InstanceID]; ok {
			et.Instance = inst
		}
		out = append(out, et)
	}
	return out, total, nil
}

// ListInitiated 我发起的(submitterID)。
func (s *TodoService) ListInitiated(ctx context.Context, page, pageSize int, userID uint) ([]enrichedInstance, int64, error) {
	instances, total, err := s.instanceRepo.PageBySubmitter(ctx, page, pageSize, userID)
	if err != nil {
		return nil, total, err
	}
	if len(instances) == 0 {
		return []enrichedInstance{}, total, nil
	}

	titleMap := fetchResourceTitles(ctx, instances)
	out := make([]enrichedInstance, 0, len(instances))
	for _, inst := range instances {
		key := fmt.Sprintf("%s:%d", inst.Type, inst.ResourceID)
		out = append(out, enrichedInstance{
			ApprovalInstance: inst,
			ResourceTitle:    titleMap[key],
			FormTypeLabel:    formTypeLabel[inst.Type],
		})
	}
	return out, total, nil
}

// GetDetail 审批详情(实例 + 任务列表 + 审批记录)。
type InstanceDetail struct {
	apprmodel.ApprovalInstance
	ResourceTitle string                   `json:"resource_title"`
	FormTypeLabel string                   `json:"form_type_label"`
	Tasks         []apprmodel.ApprovalTask `json:"tasks"`
	Records       []apprmodel.ApprovalRecord `json:"records"`
}

func (s *TodoService) GetDetail(ctx context.Context, instanceID uint) (*InstanceDetail, error) {
	instance, err := s.instanceRepo.GetByID(ctx, instanceID)
	if err != nil {
		return nil, err
	}
	detail := &InstanceDetail{
		ApprovalInstance: *instance,
		FormTypeLabel:    formTypeLabel[instance.Type],
	}
	// 查资源标题
	single := []apprmodel.ApprovalInstance{*instance}
	titleMap := fetchResourceTitles(ctx, single)
	key := fmt.Sprintf("%s:%d", instance.Type, instance.ResourceID)
	detail.ResourceTitle = titleMap[key]

	// 查全部任务
	var tasks []apprmodel.ApprovalTask
	repoDB(ctx).Where("instance_id = ? AND node_round >= 0", instanceID).Order("id ASC").Find(&tasks)
	detail.Tasks = tasks

	records, _ := s.recordRepo.ListByInstance(ctx, instanceID)
	detail.Records = records
	return detail, nil
}
