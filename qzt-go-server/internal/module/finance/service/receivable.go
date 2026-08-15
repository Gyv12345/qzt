package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/shopspring/decimal"

	finmodel "qzt-go-server/internal/model/finance"
	finrepo "qzt-go-server/internal/repository/finance"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// receivable.go 应收应付服务。

type ReceivableService struct {
	repo *finrepo.ReceivableRepo
}

func NewReceivableService() *ReceivableService {
	return &ReceivableService{repo: finrepo.NewReceivableRepo()}
}

// CreateReceivableRequest 新建往来款。
type CreateReceivableRequest struct {
	Direction      string `json:"direction" binding:"required"`
	PartyType      string `json:"party_type"`
	PartyID        *uint  `json:"party_id"`
	PartyName      string `json:"party_name" binding:"required"`
	OccurDate      string `json:"occur_date" binding:"required"`
	DueDate        string `json:"due_date"`
	OriginalAmount string `json:"original_amount" binding:"required"`
	BizType        string `json:"biz_type"`
	BizID          *uint  `json:"biz_id"`
	Remark         string `json:"remark"`
}

// Create 新建往来款。
func (s *ReceivableService) Create(ctx context.Context, req *CreateReceivableRequest) (*finmodel.FinReceivable, error) {
	if req.Direction != finmodel.DirectionReceivable && req.Direction != finmodel.DirectionPayable {
		return nil, errors.New("方向必须是 RECEIVABLE 或 PAYABLE")
	}
	amount, err := decimal.NewFromString(req.OriginalAmount)
	if err != nil {
		return nil, errors.New("金额格式错误")
	}
	occurDate, err := parseFinDate(req.OccurDate)
	if err != nil {
		return nil, errors.New("发生日期格式错误(yyyy-MM-dd)")
	}

	docNo := generateReceivableNo(ctx, req.Direction, occurDate.Time())

	var dueDate xtime.NullDateTime
	if req.DueDate != "" {
		if t, err := parseFinDate(req.DueDate); err == nil {
			dueDate = xtime.NewNullDateTimeFromTime(t.Time())
		}
	}

	rec := &finmodel.FinReceivable{
		DocNo:          docNo,
		Direction:      req.Direction,
		PartyType:      req.PartyType,
		PartyID:        req.PartyID,
		PartyName:      req.PartyName,
		OccurDate:      occurDate,
		DueDate:        dueDate,
		OriginalAmount: amount,
		SettledAmount:  decimal.Zero,
		BizType:        req.BizType,
		BizID:          req.BizID,
		Status:         finmodel.SettleStatusUnsettled,
		Remark:         req.Remark,
	}
	if err := s.repo.Create(ctx, rec); err != nil {
		return nil, err
	}
	return rec, nil
}

// List 往来款列表。
func (s *ReceivableService) List(ctx context.Context, page, pageSize int, direction, partyType string, partyID uint, status int8, bizType, keyword string) ([]finmodel.FinReceivable, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, direction, partyType, partyID, status, bizType, keyword)
}

// GetByID 详情。
func (s *ReceivableService) GetByID(ctx context.Context, id uint) (*finmodel.FinReceivable, error) {
	rec, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "往来款不存在")
	}
	return rec, nil
}

// SettleRequest 结算请求。
type SettleRequest struct {
	Amount string `json:"amount" binding:"required"`
	Remark string `json:"remark"`
}

// Settle 结算(支持部分结算)。
func (s *ReceivableService) Settle(ctx context.Context, id uint, req *SettleRequest) (*finmodel.FinReceivable, error) {
	rec, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "往来款不存在")
	}
	if rec.Status == finmodel.SettleStatusSettled {
		return nil, errors.New("已结清,不可再结算")
	}
	amount, err := decimal.NewFromString(req.Amount)
	if err != nil || amount.LessThanOrEqual(decimal.Zero) {
		return nil, errors.New("结算金额必须大于 0")
	}
	newSettled := rec.SettledAmount.Add(amount)
	if newSettled.GreaterThan(rec.OriginalAmount) {
		return nil, fmt.Errorf("结算金额超出未还余额(剩余 %s)", rec.OriginalAmount.Sub(rec.SettledAmount).String())
	}
	rec.SettledAmount = newSettled
	if newSettled.Equal(rec.OriginalAmount) {
		rec.Status = finmodel.SettleStatusSettled
	} else {
		rec.Status = finmodel.SettleStatusPartial
	}
	if req.Remark != "" {
		rec.Remark = req.Remark
	}
	if err := s.repo.Update(ctx, rec); err != nil {
		return nil, err
	}
	return rec, nil
}

// parseFinDate 解析 yyyy-MM-dd。
func parseFinDate(s string) (xtime.DateTime, error) {
	t, err := time.ParseInLocation("2006-01-02", s, time.Local)
	if err != nil {
		return xtime.DateTime{}, err
	}
	return xtime.NewDateTime(t), nil
}

// generateReceivableNo 生成往来单号(YS=应收/YF=应付 + 日期 + 序号)。
func generateReceivableNo(ctx context.Context, direction string, t time.Time) string {
	prefix := "YS"
	if direction == finmodel.DirectionPayable {
		prefix = "YF"
	}
	datePart := t.Format("20060102")
	var count int64
	repository.DBFrom(ctx).Model(&finmodel.FinReceivable{}).
		Where("doc_no LIKE ?", prefix+datePart+"%").
		Count(&count)
	return fmt.Sprintf("%s%s%03d", prefix, datePart, count+1)
}
