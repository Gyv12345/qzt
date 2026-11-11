package service

import (
	"context"
	"errors"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/pkg/numbergen"
	oarepo "qzt-go-server/internal/repository/oa"
)

// seal.go OA 印章 service。

// SealService 印章台账 service。
type SealService struct {
	repo *oarepo.SealRepo
}

func NewSealService() *SealService { return &SealService{repo: oarepo.NewSealRepo()} }

// CreateSealRequest 新建印章请求。
type CreateSealRequest struct {
	Name     string `json:"name" binding:"required"`
	Type     string `json:"type"`
	KeeperID *uint  `json:"keeper_id"`
	Status   int8   `json:"status"`
	Remark   string `json:"remark"`
}

// Create 新建印章(type 缺省 OFFICIAL,status 缺省 1 启用)。
func (s *SealService) Create(ctx context.Context, req *CreateSealRequest) (*oamodel.OaSeal, error) {
	seal := &oamodel.OaSeal{
		Name:     req.Name,
		Type:     req.Type,
		KeeperID: req.KeeperID,
		Status:   req.Status,
		Remark:   req.Remark,
	}
	if seal.Type == "" {
		seal.Type = "OFFICIAL"
	}
	if seal.Status == 0 {
		seal.Status = 1
	}
	if err := s.repo.Create(ctx, seal); err != nil {
		return nil, err
	}
	return seal, nil
}

// List 印章列表(名称/类型/状态筛选)。
func (s *SealService) List(ctx context.Context, page, pageSize int, name, sealType, status string) ([]oamodel.OaSeal, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, name, sealType, status)
}

// GetByID 印章详情。
func (s *SealService) GetByID(ctx context.Context, id uint) (*oamodel.OaSeal, error) {
	seal, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("印章不存在")
	}
	return seal, nil
}

// UpdateSealRequest 编辑印章请求。
type UpdateSealRequest struct {
	Name     string `json:"name" binding:"required"`
	Type     string `json:"type"`
	KeeperID *uint  `json:"keeper_id"`
	Status   int8   `json:"status"`
	Remark   string `json:"remark"`
}

// Update 编辑印章。
func (s *SealService) Update(ctx context.Context, id uint, req *UpdateSealRequest) error {
	seal, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("印章不存在")
	}
	seal.Name = req.Name
	seal.Type = req.Type
	seal.KeeperID = req.KeeperID
	seal.Status = req.Status
	seal.Remark = req.Remark
	return s.repo.Update(ctx, seal)
}

// Delete 删除印章(仅台账删除,历史申请不受影响)。
func (s *SealService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return errors.New("印章不存在")
	}
	return s.repo.Delete(ctx, id)
}

// SealApplicationService 用印申请 service。
type SealApplicationService struct {
	repo     *oarepo.SealApplicationRepo
	sealRepo *oarepo.SealRepo
}

func NewSealApplicationService() *SealApplicationService {
	return &SealApplicationService{
		repo:     oarepo.NewSealApplicationRepo(),
		sealRepo: oarepo.NewSealRepo(),
	}
}

// CreateSealApplicationRequest 新建用印申请请求。
type CreateSealApplicationRequest struct {
	Title        string `json:"title" binding:"required"`
	ApplicantID  uint   `json:"applicant_id"`
	DeptID       *uint  `json:"dept_id"`
	SealID       uint   `json:"seal_id" binding:"required"`
	Reason       string `json:"reason" binding:"required"`
	DocumentName string `json:"document_name"`
	Copies       int    `json:"copies"`
	SealDate     string `json:"seal_date" binding:"required"`
}

// Create 新建用印申请(编号自动生成,审批状态 NONE 待提审)。
func (s *SealApplicationService) Create(ctx context.Context, req *CreateSealApplicationRequest, userID uint) (*oamodel.OaSealApplication, error) {
	if req.ApplicantID == 0 {
		req.ApplicantID = userID
	}
	// 校验印章存在
	if _, err := s.sealRepo.GetByID(ctx, req.SealID); err != nil {
		return nil, errors.New("印章不存在")
	}

	no, _ := numbergen.Generate(ctx, "seal")
	sealDate, err := parseDateTimeField(req.SealDate)
	if err != nil {
		return nil, errors.New("用印日期格式错误")
	}

	app := &oamodel.OaSealApplication{
		ApplicationNo:  no,
		Title:          req.Title,
		ApplicantID:    req.ApplicantID,
		DeptID:         req.DeptID,
		SealID:         req.SealID,
		Reason:         req.Reason,
		DocumentName:   req.DocumentName,
		Copies:         req.Copies,
		SealDate:       sealDate,
		ApprovalStatus: oamodel.ApprovalStatusNone,
	}
	if err := s.repo.Create(ctx, app); err != nil {
		return nil, err
	}
	return app, nil
}

// List 用印申请列表(单号/标题/审批状态/申请人筛选)。
func (s *SealApplicationService) List(ctx context.Context, page, pageSize int, applicationNo, title, approvalStatus string, applicantID uint) ([]oamodel.OaSealApplication, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, applicationNo, title, approvalStatus, applicantID)
}

// GetByID 用印申请详情。
func (s *SealApplicationService) GetByID(ctx context.Context, id uint) (*oamodel.OaSealApplication, error) {
	app, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("用印申请不存在")
	}
	return app, nil
}

// UpdateSealApplicationRequest 编辑用印申请请求。
type UpdateSealApplicationRequest struct {
	Title        string `json:"title" binding:"required"`
	DeptID       *uint  `json:"dept_id"`
	SealID       uint   `json:"seal_id" binding:"required"`
	Reason       string `json:"reason" binding:"required"`
	DocumentName string `json:"document_name"`
	Copies       int    `json:"copies"`
	SealDate     string `json:"seal_date"`
}

// Update 编辑用印申请(仅未提交或已驳回可编辑)。
func (s *SealApplicationService) Update(ctx context.Context, id uint, req *UpdateSealApplicationRequest) error {
	app, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("用印申请不存在")
	}
	if !oamodel.CanEditApproval(app.ApprovalStatus) {
		return errors.New("仅未提交或已驳回的申请可编辑")
	}
	app.Title = req.Title
	app.DeptID = req.DeptID
	app.SealID = req.SealID
	app.Reason = req.Reason
	app.DocumentName = req.DocumentName
	app.Copies = req.Copies
	if req.SealDate != "" {
		if t, err := parseDateTimeField(req.SealDate); err == nil {
			app.SealDate = t
		}
	}
	return s.repo.Update(ctx, app)
}

// Delete 删除用印申请(仅未提交审批可删)。
func (s *SealApplicationService) Delete(ctx context.Context, id uint) error {
	app, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("用印申请不存在")
	}
	if app.ApprovalStatus != oamodel.ApprovalStatusNone {
		return errors.New("仅未提交审批的申请可删除")
	}
	return s.repo.Delete(ctx, id)
}
