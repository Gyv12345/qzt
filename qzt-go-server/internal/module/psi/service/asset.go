package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/pkg/numbergen"
	psirepo "qzt-go-server/internal/repository/psi"
	"qzt-go-server/pkg/xtime"
)

// asset.go 固定资产服务。

type AssetService struct {
	repo *psirepo.AssetRepo
}

func NewAssetService() *AssetService { return &AssetService{repo: psirepo.NewAssetRepo()} }

type CreateAssetRequest struct {
	Name          string `json:"name" binding:"required"`
	Category      string `json:"category"`
	Spec          string `json:"spec"`
	SerialNo      string `json:"serial_no"`
	WarehouseID   *uint  `json:"warehouse_id"`
	DeptID        *uint  `json:"dept_id"`
	OwnerID       *uint  `json:"owner_id"`
	PurchaseDate  string `json:"purchase_date"`
	PurchasePrice string `json:"purchase_price"`
	UsefulLife    int    `json:"useful_life"`
	Location      string `json:"location"`
	Remark        string `json:"remark"`
}

func (s *AssetService) Create(ctx context.Context, req *CreateAssetRequest) (*psimodel.PsiAsset, error) {
	no := generateAssetNo(ctx)
	a := &psimodel.PsiAsset{
		AssetNo:       no,
		Name:          req.Name,
		Category:      req.Category,
		Spec:          req.Spec,
		SerialNo:      req.SerialNo,
		WarehouseID:   req.WarehouseID,
		DeptID:        req.DeptID,
		OwnerID:       req.OwnerID,
		PurchasePrice: req.PurchasePrice,
		NetValue:      req.PurchasePrice,
		UsefulLife:    req.UsefulLife,
		Status:        psimodel.AssetStatusInUse,
		Location:      req.Location,
		Remark:        req.Remark,
	}
	if req.PurchaseDate != "" {
		if t, err := time.ParseInLocation("2006-01-02", req.PurchaseDate, time.Local); err == nil {
			a.PurchaseDate = xtime.NewNullDateTimeFromTime(t)
		}
	}
	if err := s.repo.Create(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *AssetService) List(ctx context.Context, page, pageSize int, keyword, category string, status int8, ownerID, deptID uint) ([]psimodel.PsiAsset, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, keyword, category, status, ownerID, deptID)
}

func (s *AssetService) GetByID(ctx context.Context, id uint) (*psimodel.PsiAsset, error) {
	a, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("资产不存在")
	}
	return a, nil
}

type UpdateAssetRequest struct {
	Name          string `json:"name" binding:"required"`
	Category      string `json:"category"`
	Spec          string `json:"spec"`
	SerialNo      string `json:"serial_no"`
	WarehouseID   *uint  `json:"warehouse_id"`
	DeptID        *uint  `json:"dept_id"`
	OwnerID       *uint  `json:"owner_id"`
	PurchasePrice string `json:"purchase_price"`
	Depreciation  string `json:"depreciation"`
	NetValue      string `json:"net_value"`
	UsefulLife    int    `json:"useful_life"`
	Status        int8   `json:"status"`
	Location      string `json:"location"`
	Remark        string `json:"remark"`
}

func (s *AssetService) Update(ctx context.Context, id uint, req *UpdateAssetRequest) error {
	a, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("资产不存在")
	}
	a.Name = req.Name
	a.Category = req.Category
	a.Spec = req.Spec
	a.SerialNo = req.SerialNo
	a.WarehouseID = req.WarehouseID
	a.DeptID = req.DeptID
	a.OwnerID = req.OwnerID
	a.PurchasePrice = req.PurchasePrice
	a.Depreciation = req.Depreciation
	a.NetValue = req.NetValue
	a.UsefulLife = req.UsefulLife
	if req.Status > 0 {
		a.Status = req.Status
	}
	a.Location = req.Location
	a.Remark = req.Remark
	return s.repo.Update(ctx, a)
}

func (s *AssetService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return errors.New("资产不存在")
	}
	return s.repo.Delete(ctx, id)
}

func generateAssetNo(ctx context.Context) string {
	datePart := time.Now().Format("20060102")
	// 查询出错沿袭原语义:忽略,按 0 推算序号
	count, _ := psirepo.NewAssetRepo().CountByNoPrefix(ctx, "ZC"+datePart)
	return fmt.Sprintf("ZC%s%03d", datePart, count+1)
}

// 注册编号规则(numbergen 也能用,但资产编号直接生成更简单)
func init() {
	numbergen.Register("asset", numbergen.Rule{
		Enabled: true, Prefix: "ZC", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			return psirepo.NewAssetRepo().CountByNoPrefix(ctx, prefix+datePart)
		},
	})
}
