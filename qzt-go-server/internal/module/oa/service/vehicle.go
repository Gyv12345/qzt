package service

import (
	"context"
	"errors"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	oarepo "qzt-go-server/internal/repository/oa"
)

// vehicle.go OA 用车 service。

// 车辆台账状态(与 oa_vehicle.status 列注释一致)。
const (
	VehicleStatusIdle        = "IDLE"        // 空闲
	VehicleStatusInUse       = "IN_USE"      // 使用中
	VehicleStatusMaintenance = "MAINTENANCE" // 维修中
	VehicleStatusDisabled    = "DISABLED"    // 停用
)

// VehicleService 车辆台账 service。
type VehicleService struct {
	repo *oarepo.VehicleRepo
}

func NewVehicleService() *VehicleService { return &VehicleService{repo: oarepo.NewVehicleRepo()} }

// CreateVehicleRequest 新建车辆请求。
type CreateVehicleRequest struct {
	PlateNo      string `json:"plate_no" binding:"required"`
	VehicleModel string `json:"vehicle_model"`
	Seats        int    `json:"seats"`
	Status       string `json:"status"`
	OwnerID      *uint  `json:"owner_id"`
	Remark       string `json:"remark"`
}

// Create 新建车辆(status 缺省 IDLE,seats 缺省 5)。
func (s *VehicleService) Create(ctx context.Context, req *CreateVehicleRequest) (*oamodel.OaVehicle, error) {
	v := &oamodel.OaVehicle{
		PlateNo:      req.PlateNo,
		VehicleModel: req.VehicleModel,
		Seats:        req.Seats,
		Status:       req.Status,
		OwnerID:      req.OwnerID,
		Remark:       req.Remark,
	}
	if v.Status == "" {
		v.Status = VehicleStatusIdle
	}
	if v.Seats == 0 {
		v.Seats = 5
	}
	if err := s.repo.Create(ctx, v); err != nil {
		return nil, err
	}
	return v, nil
}

// List 车辆列表(车牌/状态筛选)。
func (s *VehicleService) List(ctx context.Context, page, pageSize int, plateNo, status string) ([]oamodel.OaVehicle, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, plateNo, status)
}

// GetByID 车辆详情。
func (s *VehicleService) GetByID(ctx context.Context, id uint) (*oamodel.OaVehicle, error) {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("车辆不存在")
	}
	return v, nil
}

// UpdateVehicleRequest 编辑车辆请求。
type UpdateVehicleRequest struct {
	PlateNo      string `json:"plate_no" binding:"required"`
	VehicleModel string `json:"vehicle_model"`
	Seats        int    `json:"seats"`
	Status       string `json:"status"`
	OwnerID      *uint  `json:"owner_id"`
	Remark       string `json:"remark"`
}

// Update 编辑车辆。
func (s *VehicleService) Update(ctx context.Context, id uint, req *UpdateVehicleRequest) error {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("车辆不存在")
	}
	v.PlateNo = req.PlateNo
	v.VehicleModel = req.VehicleModel
	v.Seats = req.Seats
	v.Status = req.Status
	v.OwnerID = req.OwnerID
	v.Remark = req.Remark
	return s.repo.Update(ctx, v)
}

// Delete 删除车辆(仅台账删除,历史申请不受影响)。
func (s *VehicleService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return errors.New("车辆不存在")
	}
	return s.repo.Delete(ctx, id)
}

// VehicleApplicationService 用车申请 service。
type VehicleApplicationService struct {
	repo        *oarepo.VehicleApplicationRepo
	vehicleRepo *oarepo.VehicleRepo
}

func NewVehicleApplicationService() *VehicleApplicationService {
	return &VehicleApplicationService{
		repo:        oarepo.NewVehicleApplicationRepo(),
		vehicleRepo: oarepo.NewVehicleRepo(),
	}
}

// CreateVehicleApplicationRequest 新建用车申请请求。
type CreateVehicleApplicationRequest struct {
	Title       string `json:"title" binding:"required"`
	ApplicantID uint   `json:"applicant_id"`
	DeptID      *uint  `json:"dept_id"`
	VehicleID   uint   `json:"vehicle_id" binding:"required"`
	Reason      string `json:"reason" binding:"required"`
	StartTime   string `json:"start_time" binding:"required"`
	EndTime     string `json:"end_time" binding:"required"`
	Passengers  int    `json:"passengers"`
	Destination string `json:"destination"`
}

// Create 新建用车申请(编号自动生成,审批状态 NONE 待提审)。
func (s *VehicleApplicationService) Create(ctx context.Context, req *CreateVehicleApplicationRequest, userID uint) (*oamodel.OaVehicleApplication, error) {
	if req.ApplicantID == 0 {
		req.ApplicantID = userID
	}
	// 校验车辆存在且状态可借(停用不可借)
	vehicle, err := s.vehicleRepo.GetByID(ctx, req.VehicleID)
	if err != nil {
		return nil, errors.New("车辆不存在")
	}
	if vehicle.Status == VehicleStatusDisabled {
		return nil, errors.New("车辆已停用,不可申请")
	}

	no, _ := numbergen.Generate(ctx, "vehicle")
	startTime, err := parseDateTimeField(req.StartTime)
	if err != nil {
		return nil, errors.New("出发时间格式错误")
	}
	endTime, err := parseDateTimeField(req.EndTime)
	if err != nil {
		return nil, errors.New("预计归还时间格式错误")
	}

	app := &oamodel.OaVehicleApplication{
		ApplicationNo:  no,
		Title:          req.Title,
		ApplicantID:    req.ApplicantID,
		DeptID:         req.DeptID,
		VehicleID:      req.VehicleID,
		Reason:         req.Reason,
		StartTime:      startTime,
		EndTime:        endTime,
		Passengers:     req.Passengers,
		Destination:    req.Destination,
		ApprovalStatus: oamodel.ApprovalStatusNone,
	}
	if err := s.repo.Create(ctx, app); err != nil {
		return nil, err
	}
	return app, nil
}

// List 用车申请列表(单号/标题/审批状态/申请人筛选)。
func (s *VehicleApplicationService) List(ctx context.Context, page, pageSize int, applicationNo, title, approvalStatus string, applicantID uint) ([]oamodel.OaVehicleApplication, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, applicationNo, title, approvalStatus, applicantID)
}

// GetByID 用车申请详情。
func (s *VehicleApplicationService) GetByID(ctx context.Context, id uint) (*oamodel.OaVehicleApplication, error) {
	app, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("用车申请不存在")
	}
	return app, nil
}

// UpdateVehicleApplicationRequest 编辑用车申请请求。
type UpdateVehicleApplicationRequest struct {
	Title       string `json:"title" binding:"required"`
	DeptID      *uint  `json:"dept_id"`
	VehicleID   uint   `json:"vehicle_id" binding:"required"`
	Reason      string `json:"reason" binding:"required"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
	Passengers  int    `json:"passengers"`
	Destination string `json:"destination"`
}

// Update 编辑用车申请(仅未提交或已驳回可编辑)。
func (s *VehicleApplicationService) Update(ctx context.Context, id uint, req *UpdateVehicleApplicationRequest) error {
	app, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("用车申请不存在")
	}
	if !oamodel.CanEditApproval(app.ApprovalStatus) {
		return errors.New("仅未提交或已驳回的申请可编辑")
	}
	app.Title = req.Title
	app.DeptID = req.DeptID
	app.VehicleID = req.VehicleID
	app.Reason = req.Reason
	if req.StartTime != "" {
		if t, err := parseDateTimeField(req.StartTime); err == nil {
			app.StartTime = t
		}
	}
	if req.EndTime != "" {
		if t, err := parseDateTimeField(req.EndTime); err == nil {
			app.EndTime = t
		}
	}
	app.Passengers = req.Passengers
	app.Destination = req.Destination
	return s.repo.Update(ctx, app)
}

// Delete 删除用车申请(仅未提交审批可删)。
func (s *VehicleApplicationService) Delete(ctx context.Context, id uint) error {
	app, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("用车申请不存在")
	}
	if app.ApprovalStatus != oamodel.ApprovalStatusNone {
		return errors.New("仅未提交审批的申请可删除")
	}
	return s.repo.Delete(ctx, id)
}

// Return 归还车辆。仅审批通过(APPROVED)且用车中(Status=1)可归还;
// 同一事务内:申请单 Status 置 2(已归还) + 车辆状态回 IDLE。
func (s *VehicleApplicationService) Return(ctx context.Context, id uint) error {
	return repository.Transaction(ctx, func(ctx context.Context) error {
		app, err := s.repo.GetByID(ctx, id)
		if err != nil {
			return errors.New("用车申请不存在")
		}
		if app.ApprovalStatus != oamodel.ApprovalStatusApproved {
			return errors.New("仅审批通过的用车单可归还")
		}
		if app.Status != 1 {
			return errors.New("该用车单已归还")
		}
		vehicle, err := s.vehicleRepo.GetByID(ctx, app.VehicleID)
		if err != nil {
			return errors.New("车辆不存在")
		}
		app.Status = 2 // 已归还
		if err := s.repo.Update(ctx, app); err != nil {
			return err
		}
		vehicle.Status = VehicleStatusIdle
		return s.vehicleRepo.Update(ctx, vehicle)
	})
}
