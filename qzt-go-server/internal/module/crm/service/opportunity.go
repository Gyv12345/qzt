package service

import (
	"context"
	"errors"
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
	Name              string          `json:"name" binding:"required"`
	OpportunityNo     string          `json:"opportunity_no"` // 留空则自动生成
	CustomerID        uint            `json:"customer_id" binding:"required"`
	ExpectedAmount    decimal.Decimal `json:"expected_amount"`
	ExpectedCloseDate xtime.NullDateTime `json:"expected_close_date"`
	Stage             string          `json:"stage"`
	Probability       *int            `json:"probability"`
	OwnerID           *uint           `json:"owner_id"`
	Description       string          `json:"description"`
}

// Create 创建商机(默认 stage=PROSPECTING,owner 默认当前用户)。
func (s *OpportunityService) Create(ctx context.Context, req *CreateOpportunityRequest, currentUserID uint) (*crmmodel.CrmOpportunity, error) {
	ownerID := req.OwnerID
	if ownerID == nil {
		ownerID = &currentUserID
	}
	stage := req.Stage
	if stage == "" {
		stage = crmmodel.OppStageProspecting
	}
	// 自动生成商机编号(用户填了用手填的,留空才自动)
	oppNo := req.OpportunityNo
	if oppNo == "" {
		oppNo, _ = numbergen.Generate(ctx, "opportunity")
	}
	opp := &crmmodel.CrmOpportunity{
		Name: req.Name, OpportunityNo: oppNo, CustomerID: req.CustomerID, ExpectedAmount: req.ExpectedAmount,
		ExpectedCloseDate: req.ExpectedCloseDate, Stage: stage, Probability: req.Probability,
		OwnerID: ownerID, Description: req.Description,
	}
	if err := s.repo.Create(ctx, opp); err != nil {
		return nil, err
	}
	return opp, nil
}

// GetByID 商机详情。
func (s *OpportunityService) GetByID(ctx context.Context, id uint) (*crmmodel.CrmOpportunity, error) {
	opp, err := s.repo.GetByID(ctx, id)
	return opp, repository.NotFoundOr(err, "商机不存在")
}

// UpdateOpportunityRequest 更新商机请求。
type UpdateOpportunityRequest struct {
	Name              string          `json:"name" binding:"required"`
	CustomerID        uint            `json:"customer_id" binding:"required"`
	ExpectedAmount    decimal.Decimal `json:"expected_amount"`
	ExpectedCloseDate xtime.NullDateTime `json:"expected_close_date"`
	Stage             string          `json:"stage"`
	Probability       *int            `json:"probability"`
	OwnerID           *uint           `json:"owner_id"`
	Description       string          `json:"description"`
}

// Update 更新商机(不含阶段流转,阶段走 ChangeStage)。
func (s *OpportunityService) Update(ctx context.Context, id uint, req *UpdateOpportunityRequest, operatorID uint) error {
	opp, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "商机不存在")
	}
	// 复制旧值快照(用于 diff)
	oldSnapshot := *opp
	opp.Name = req.Name
	opp.CustomerID = req.CustomerID
	opp.ExpectedAmount = req.ExpectedAmount
	opp.ExpectedCloseDate = req.ExpectedCloseDate
	if req.Stage != "" {
		opp.Stage = req.Stage
	}
	opp.Probability = req.Probability
	opp.OwnerID = req.OwnerID
	opp.Description = req.Description
	// diff 字段变更
	changes := diff.DiffStructs(&oldSnapshot, opp, opportunityFieldDefs)

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Update(ctx, opp); err != nil {
			return err
		}
		recordChanges(ctx, model.BizTypeOpportunity, id, operatorID, changes)
		return nil
	})
}

// Delete 删除商机。
func (s *OpportunityService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "商机不存在")
	}
	return s.repo.Delete(ctx, id)
}

// List 商机列表(分页 + keyword 名称模糊 + customerID + stage 过滤)。
func (s *OpportunityService) List(ctx context.Context, page, pageSize int, keyword string, customerID uint, stage string) ([]crmmodel.CrmOpportunity, int64, error) {
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
	return s.repo.PageList(ctx, page, pageSize, q)
}

// Board 商机看板:按阶段分组(stage -> 商机列表)。
func (s *OpportunityService) Board(ctx context.Context) (map[string][]crmmodel.CrmOpportunity, error) {
	list, err := s.repo.ListByStage(ctx, "")
	if err != nil {
		return nil, err
	}
	out := make(map[string][]crmmodel.CrmOpportunity)
	for i := range list {
		key := list[i].Stage
		out[key] = append(out[key], list[i])
	}
	return out, nil
}

// ChangeStage 商机阶段流转(事务内):先取当前阶段,调 stageSvc.ChangeStage
// 写 stage_record 并拿到新阶段概率,再更新商机的 Stage 与 Probability。
func (s *OpportunityService) ChangeStage(ctx context.Context, id uint, toStage string, operatorID uint, reason string) error {
	opp, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "商机不存在")
	}
	if opp.Stage == toStage {
		return errors.New("新阶段与当前阶段相同")
	}
	fromStage := opp.Stage
	return repository.Transaction(ctx, func(ctx context.Context) error {
		prob, err := s.stageSvc.ChangeStage(ctx, stageBizOpportunity, id, fromStage, toStage, operatorID, reason)
		if err != nil {
			return err
		}
		opp.Stage = toStage
		opp.Probability = &prob
		return s.repo.Update(ctx, opp)
	})
}

// StageHistory 商机阶段变更历史。
func (s *OpportunityService) StageHistory(ctx context.Context, id uint) ([]crmmodel.StageRecord, error) {
	return s.stageSvc.ListStageHistory(ctx, stageBizOpportunity, id)
}

// UpdateFollow 更新商机的跟进人/跟进时间(跟进记录创建后调用)。
func (s *OpportunityService) UpdateFollow(ctx context.Context, id, followerID uint, followTime time.Time) error {
	opp, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil // 关联可选,静默忽略
	}
	opp.FollowerID = &followerID
	opp.FollowTime = xtime.NewNullDateTimeFromTime(followTime)
	return s.repo.Update(ctx, opp)
}
