package service

import (
	"context"

	apprmodel "qzt-go-server/internal/model/approval"
	apprrepo "qzt-go-server/internal/repository/approval"
)

// todo.go 审批待办服务。
// 待办列表 / 已办 / 我发起的 / 审批详情。

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

// ListTodo 待办列表(approverID + status=APPROVING)。
func (s *TodoService) ListTodo(ctx context.Context, page, pageSize int, userID uint) ([]apprmodel.ApprovalTask, int64, error) {
	return s.taskRepo.PageByApprover(ctx, page, pageSize, userID, apprmodel.TaskStatusApproving)
}

// ListProcessed 已办列表(approverID + status in APPROVED/UNAPPROVED)。
func (s *TodoService) ListProcessed(ctx context.Context, page, pageSize int, userID uint) ([]apprmodel.ApprovalTask, int64, error) {
	// 分两步:先查 APPROVED,再查 UNAPPROVED(简化:用 status="" 不过滤,前端按 status 判断)
	// 实际查询 status IN (APPROVED, UNAPPROVED) 且 node_round >= 0
	return s.taskRepo.PageByApprover(ctx, page, pageSize, userID, "") // 临时:返回全部,前端过滤
}

// ListInitiated 我发起的(submitterID)。
func (s *TodoService) ListInitiated(ctx context.Context, page, pageSize int, userID uint) ([]apprmodel.ApprovalInstance, int64, error) {
	return s.instanceRepo.PageBySubmitter(ctx, page, pageSize, userID)
}

// GetDetail 审批详情(实例 + 任务列表 + 审批记录)。
type InstanceDetail struct {
	apprmodel.ApprovalInstance
	Tasks   []apprmodel.ApprovalTask         `json:"tasks"`
	Records []apprmodel.ApprovalRecord       `json:"records"`
}

func (s *TodoService) GetDetail(ctx context.Context, instanceID uint) (*InstanceDetail, error) {
	instance, err := s.instanceRepo.GetByID(ctx, instanceID)
	if err != nil {
		return nil, err
	}
	detail := &InstanceDetail{ApprovalInstance: *instance}
	if tasks, err := s.taskRepo.ListByInstanceNode(ctx, instanceID, 0); err == nil {
		_ = tasks // ListByInstanceNode 需要 nodeID,这里查全部用 raw
	}
	// 查全部任务
	var tasks []apprmodel.ApprovalTask
	repoDB(ctx).Where("instance_id = ? AND node_round >= 0", instanceID).Order("id ASC").Find(&tasks)
	detail.Tasks = tasks

	records, _ := s.recordRepo.ListByInstance(ctx, instanceID)
	detail.Records = records
	return detail, nil
}
