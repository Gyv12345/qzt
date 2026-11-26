package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model"
	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/datascope"
	"qzt-go-server/internal/pkg/diff"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xtime"
)

// opportunityFieldDefs 商机可对比的业务字段(CrmOpportunity 实际存在的字段)。
var opportunityFieldDefs = []diff.FieldDef{
	{Name: "Name", Label: "商机名称"},
	{Name: "CustomerID", Label: "客户"},
	{Name: "Stage", Label: "阶段"},
	{Name: "Probability", Label: "成交概率"},
	{Name: "OwnerID", Label: "负责人"},
	{Name: "ExpectedAmount", Label: "预期金额"},
	{Name: "Description", Label: "描述"},
}

// opportunity.go 商机服务:CRUD + 看板分组 + 阶段流转 + 跟进联动。

// 业务类型(stage_record.biz_type),商机固定为 OPPORTUNITY。
const stageBizOpportunity = "OPPORTUNITY"

// OpportunityService 商机服务。
type OpportunityService struct {
	repo     *crrepo.OpportunityRepo
	stageSvc *StageService
}

func NewOpportunityService() *OpportunityService {
	return &OpportunityService{repo: crrepo.NewOpportunityRepo(), stageSvc: NewStageService()}
}

// CreateOpportunityRequest 创建商机请求。
type CreateOpportunityRequest struct {
	Name              string             `json:"name" binding:"required"`
	OpportunityNo     string             `json:"opportunity_no"` // 留空则自动生成
	CustomerID        uint               `json:"customer_id" binding:"required"`
	ExpectedAmount    decimal.Decimal    `json:"expected_amount"`
	ExpectedCloseDate xtime.NullDateTime `json:"expected_close_date"`
	Stage             string             `json:"stage"`
	LostReason        string             `json:"lost_reason"`
	Probability       *int               `json:"probability"`
	OwnerID           *uint              `json:"owner_id"`
	Description       string             `json:"description"`
}

// Create 创建商机(默认 stage=PROSPECTING,owner 默认当前用户),并记录初始阶段。
func (s *OpportunityService) Create(ctx context.Context, req *CreateOpportunityRequest, currentUserID uint) (*crmmodel.CrmOpportunity, error) {
	ownerID := req.OwnerID
	if ownerID == nil {
		ownerID = &currentUserID
	}
	stage := req.Stage
	if stage == "" {
		stage = crmmodel.OppStageProspecting
	}
	_, defs, err := s.stageSvc.GetByBizType(ctx, stageBizOpportunity)
	if err != nil {
		return nil, err
	}
	targetDef, ok := FindStageDef(defs, stage)
	if !ok {
		return nil, fmt.Errorf("阶段 %q 不存在于配置中", stage)
	}
	opp := &crmmodel.CrmOpportunity{
		Name: req.Name, CustomerID: req.CustomerID, ExpectedAmount: req.ExpectedAmount,
		ExpectedCloseDate: req.ExpectedCloseDate, Stage: stage, Probability: req.Probability,
		OwnerID: ownerID, Description: req.Description, LostReason: strings.TrimSpace(req.LostReason),
	}
	if err := validateStageRequirements(opp, targetDef); err != nil {
		return nil, err
	}
	if stage == crmmodel.OppStageLost && opp.LostReason == "" {
		return nil, errors.New("进入已丢失阶段必须选择输单原因")
	}
	if opp.Probability == nil {
		probability := targetDef.Probability
		opp.Probability = &probability
	}
	// 自动生成商机编号(用户填了用手填的,留空才自动)
	opp.OpportunityNo = req.OpportunityNo
	if opp.OpportunityNo == "" {
		opp.OpportunityNo, _ = numbergen.Generate(ctx, "opportunity")
	}
	now := time.Now()
	opp.StageEnteredAt = xtime.NewNullDateTimeFromTime(now)
	err = repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Create(ctx, opp); err != nil {
			return err
		}
		_, err := s.stageSvc.ChangeStageAt(ctx, stageBizOpportunity, opp.ID, "", stage, currentUserID, "创建商机", opp.LostReason, now)
		return err
	})
	if err != nil {
		return nil, err
	}
	decorateOpportunity(opp, defs, now)
	return opp, nil
}

// GetByID 商机详情。
func (s *OpportunityService) GetByID(ctx context.Context, id uint) (*crmmodel.CrmOpportunity, error) {
	opp, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "商机不存在")
	}
	if err := checkOwnerScope(ctx, opp.OwnerID); err != nil {
		return nil, err
	}
	if _, defs, defErr := s.stageSvc.GetByBizType(ctx, stageBizOpportunity); defErr == nil {
		decorateOpportunity(opp, defs, time.Now())
	} else {
		decorateOpportunity(opp, nil, time.Now())
	}
	return opp, nil
}

// UpdateOpportunityRequest 更新商机请求。
type UpdateOpportunityRequest struct {
	Name              string             `json:"name" binding:"required"`
	CustomerID        uint               `json:"customer_id" binding:"required"`
	ExpectedAmount    decimal.Decimal    `json:"expected_amount"`
	ExpectedCloseDate xtime.NullDateTime `json:"expected_close_date"`
	Stage             string             `json:"stage"`
	LostReason        string             `json:"lost_reason"`
	Probability       *int               `json:"probability"`
	OwnerID           *uint              `json:"owner_id"`
	Description       string             `json:"description"`
}

// Update 更新商机。旧客户端若同时修改 stage,内部仍走统一阶段流转并记录历史。
func (s *OpportunityService) Update(ctx context.Context, id uint, req *UpdateOpportunityRequest, operatorID uint) error {
	opp, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "商机不存在")
	}
	if err := checkOwnerScope(ctx, opp.OwnerID); err != nil {
		return err
	}
	oldSnapshot := *opp
	targetStage := req.Stage
	opp.Name = req.Name
	opp.CustomerID = req.CustomerID
	opp.ExpectedAmount = req.ExpectedAmount
	opp.ExpectedCloseDate = req.ExpectedCloseDate
	opp.Probability = req.Probability
	opp.OwnerID = req.OwnerID
	opp.Description = req.Description

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Update(ctx, opp); err != nil {
			return err
		}
		if targetStage != "" && targetStage != oldSnapshot.Stage {
			if err := s.changeStage(ctx, opp, targetStage, operatorID, "普通编辑同步流转", strings.TrimSpace(req.LostReason)); err != nil {
				return err
			}
		}
		changes := diff.DiffStructs(&oldSnapshot, opp, opportunityFieldDefs)
		recordChanges(ctx, model.BizTypeOpportunity, id, operatorID, changes)
		return nil
	})
}

// Delete 删除商机。
func (s *OpportunityService) Delete(ctx context.Context, id uint) error {
	opp, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "商机不存在")
	}
	if err := checkOwnerScope(ctx, opp.OwnerID); err != nil {
		return err
	}
	return s.repo.Delete(ctx, id)
}

// OpportunityListRow 商机列表行:回填客户名(客户可能不在查看者数据范围内,
// 前端拿不到名称会退化成裸 ID,故在服务层跨表回填)。
type OpportunityListRow struct {
	crmmodel.CrmOpportunity
	CustomerName string `json:"customer_name"`
}

// List 商机列表(分页 + keyword 名称模糊 + customerID + stage 过滤)。
func (s *OpportunityService) List(ctx context.Context, page, pageSize int, keyword string, customerID uint, stage string) ([]OpportunityListRow, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]any{}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword}
	}
	if customerID > 0 {
		where["customer_id"] = customerID
	}
	if stage != "" {
		where["stage"] = stage
	}
	if len(where) > 0 {
		q.Where = where
	}
	if cond := datascope.BuildCond(ctx, "owner_id"); cond != nil {
		q.Conds = append(q.Conds, *cond)
	}
	list, total, err := s.repo.PageList(ctx, page, pageSize, q)
	if err != nil || len(list) == 0 {
		rows := make([]OpportunityListRow, 0)
		return rows, total, err
	}
	rows, err := s.enrichOpportunities(ctx, list)
	if err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

// Board 商机看板:按阶段分组(stage -> 商机列表),与列表使用相同数据权限。
func (s *OpportunityService) Board(ctx context.Context) (map[string][]OpportunityListRow, error) {
	var conds []repository.Cond
	if cond := datascope.BuildCond(ctx, "owner_id"); cond != nil {
		conds = append(conds, *cond)
	}
	list, err := s.repo.ListByStage(ctx, "", conds...)
	if err != nil {
		return nil, err
	}
	rows, err := s.enrichOpportunities(ctx, list)
	if err != nil {
		return nil, err
	}
	out := make(map[string][]OpportunityListRow)
	for i := range rows {
		key := rows[i].Stage
		out[key] = append(out[key], rows[i])
	}
	return out, nil
}

// enrichOpportunities 批量回填客户名与当前阶段停留指标。
func (s *OpportunityService) enrichOpportunities(ctx context.Context, list []crmmodel.CrmOpportunity) ([]OpportunityListRow, error) {
	rows := make([]OpportunityListRow, 0, len(list))
	if len(list) == 0 {
		return rows, nil
	}
	customerIDs := make([]uint, 0, len(list))
	for _, o := range list {
		customerIDs = append(customerIDs, o.CustomerID)
	}
	customers, err := crrepo.NewCustomerRepo().ListByIDs(ctx, customerIDs)
	if err != nil {
		return nil, err
	}
	customerNames := make(map[uint]string, len(customers))
	for _, c := range customers {
		customerNames[c.ID] = c.Name
	}
	var defs []StageDef
	if _, configured, defErr := s.stageSvc.GetByBizType(ctx, stageBizOpportunity); defErr == nil {
		defs = configured
	}
	now := time.Now()
	for i := range list {
		decorateOpportunity(&list[i], defs, now)
		rows = append(rows, OpportunityListRow{CrmOpportunity: list[i], CustomerName: customerNames[list[i].CustomerID]})
	}
	return rows, nil
}

// ChangeStage 商机阶段流转。lostReason 为可选参数以兼容既有内部调用方;
// 进入 LOST 时业务校验仍强制要求非空。
func (s *OpportunityService) ChangeStage(ctx context.Context, id uint, toStage string, operatorID uint, reason string, lostReason ...string) error {
	opp, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "商机不存在")
	}
	if err := checkOwnerScope(ctx, opp.OwnerID); err != nil {
		return err
	}
	if opp.Stage == toStage {
		return errors.New("新阶段与当前阶段相同")
	}
	structuredReason := ""
	if len(lostReason) > 0 {
		structuredReason = strings.TrimSpace(lostReason[0])
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		return s.changeStage(ctx, opp, toStage, operatorID, reason, structuredReason)
	})
}

// changeStage 在事务内执行统一校验、历史快照与乐观锁更新。
func (s *OpportunityService) changeStage(ctx context.Context, opp *crmmodel.CrmOpportunity, toStage string, operatorID uint, reason, lostReason string) error {
	fromStage := opp.Stage
	if fromStage == toStage {
		return errors.New("新阶段与当前阶段相同")
	}
	_, defs, err := s.stageSvc.GetByBizType(ctx, stageBizOpportunity)
	if err != nil {
		return err
	}
	targetDef, ok := FindStageDef(defs, toStage)
	if !ok {
		return fmt.Errorf("阶段 %q 不存在于配置中", toStage)
	}
	if err := validateStageRequirements(opp, targetDef); err != nil {
		return err
	}
	if toStage == crmmodel.OppStageLost && lostReason == "" {
		return errors.New("进入已丢失阶段必须选择输单原因")
	}
	currentDef, hasCurrentDef := FindStageDef(defs, fromStage)
	if hasCurrentDef && currentDef.RequireFollowup && toStage != crmmodel.OppStageLost {
		since := time.Time{}
		if !opp.StageEnteredAt.IsZero() {
			since = time.Time(opp.StageEnteredAt)
		}
		hasFollowup, err := crrepo.NewFollowUpRecordRepo().HasOpportunityFollowupSince(ctx, opp.ID, since)
		if err != nil {
			return err
		}
		if !hasFollowup {
			return fmt.Errorf("离开%s前需先添加一条本阶段跟进记录", currentDef.Label)
		}
	}
	now := time.Now()
	probability, err := s.stageSvc.ChangeStageAt(ctx, stageBizOpportunity, opp.ID, fromStage, toStage, operatorID, reason, lostReason, now)
	if err != nil {
		return err
	}
	currentLostReason := lostReason
	if toStage != crmmodel.OppStageLost {
		currentLostReason = ""
	}
	updated, err := s.repo.UpdateStage(ctx, opp.ID, fromStage, toStage, probability, now, currentLostReason)
	if err != nil {
		return err
	}
	if !updated {
		return errors.New("商机阶段已被其他操作更新,请刷新后重试")
	}
	opp.Stage = toStage
	opp.Probability = &probability
	opp.StageEnteredAt = xtime.NewNullDateTimeFromTime(now)
	opp.LostReason = currentLostReason
	opp.StageStagnantRemindedOn = xtime.NullDateTime{}
	decorateOpportunity(opp, defs, now)
	return nil
}

// StageHistory 商机阶段变更历史。
func (s *OpportunityService) StageHistory(ctx context.Context, id uint) ([]crmmodel.StageRecord, error) {
	opp, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "商机不存在")
	}
	if err := checkOwnerScope(ctx, opp.OwnerID); err != nil {
		return nil, err
	}
	return s.stageSvc.ListStageHistory(ctx, stageBizOpportunity, id)
}

// UpdateFollow 更新商机的跟进人/跟进时间(跟进记录创建后调用)。
func (s *OpportunityService) UpdateFollow(ctx context.Context, id, followerID uint, followTime time.Time) error {
	opp, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil // 关联可选,静默忽略
	}
	if err := checkOwnerScope(ctx, opp.OwnerID); err != nil {
		return err
	}
	opp.FollowerID = &followerID
	opp.FollowTime = xtime.NewNullDateTimeFromTime(followTime)
	return s.repo.Update(ctx, opp)
}
