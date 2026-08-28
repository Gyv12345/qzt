package service

import (
	"context"
	"errors"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xtime"
)

// ticket.go 售后工单服务。

type TicketService struct {
	repo    *crrepo.TicketRepo
	logRepo *crrepo.TicketLogRepo
}

func NewTicketService() *TicketService {
	return &TicketService{repo: crrepo.NewTicketRepo(), logRepo: crrepo.NewTicketLogRepo()}
}

type CreateTicketRequest struct {
	Title        string `json:"title" binding:"required"`
	Description  string `json:"description"`
	CustomerID   *uint  `json:"customer_id"`
	CustomerName string `json:"customer_name"`
	ContractID   *uint  `json:"contract_id"`
	ContactName  string `json:"contact_name"`
	ContactPhone string `json:"contact_phone"`
	Category     string `json:"category"`
	Priority     int8   `json:"priority"`
}

func (s *TicketService) Create(ctx context.Context, req *CreateTicketRequest) (*crmmodel.CrmTicket, error) {
	no, _ := numbergen.Generate(ctx, "ticket")
	t := &crmmodel.CrmTicket{
		TicketNo:     no,
		Title:        req.Title,
		Description:  req.Description,
		CustomerID:   req.CustomerID,
		CustomerName: req.CustomerName,
		ContractID:   req.ContractID,
		ContactName:  req.ContactName,
		ContactPhone: req.ContactPhone,
		Category:     req.Category,
		Priority:     req.Priority,
		Status:       crmmodel.TicketStatusOpen,
	}
	if t.Priority == 0 {
		t.Priority = crmmodel.TicketPriorityNormal
	}
	if err := s.repo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *TicketService) List(ctx context.Context, page, pageSize int, keyword, category string, status, priority int8, customerID, handlerID uint) ([]crmmodel.CrmTicket, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, keyword, category, status, priority, customerID, handlerID)
}

func (s *TicketService) GetByID(ctx context.Context, id uint) (*crmmodel.TicketDetail, error) {
	t, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "工单不存在")
	}
	// 历史数据 customer_name 可能为空,动态回填避免详情显示空白
	if t.CustomerName == "" && t.CustomerID != nil && *t.CustomerID > 0 {
		if customers, err := crrepo.NewCustomerRepo().ListByIDs(ctx, []uint{*t.CustomerID}); err == nil && len(customers) > 0 {
			t.CustomerName = customers[0].Name
		}
	}
	logs, err := s.logRepo.ListByTicket(ctx, id)
	if err != nil {
		return nil, err
	}
	return &crmmodel.TicketDetail{Ticket: *t, Logs: logs}, nil
}

type UpdateTicketRequest struct {
	Title        string `json:"title"`
	Description  string `json:"description"`
	CustomerID   *uint  `json:"customer_id"`
	CustomerName string `json:"customer_name"`
	ContractID   *uint  `json:"contract_id"`
	ContactName  string `json:"contact_name"`
	ContactPhone string `json:"contact_phone"`
	Category     string `json:"category"`
	Priority     int8   `json:"priority"`
	HandlerID    *uint  `json:"handler_id"`
}

func (s *TicketService) Update(ctx context.Context, id uint, req *UpdateTicketRequest) error {
	t, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "工单不存在")
	}
	if t.Status == crmmodel.TicketStatusClosed {
		return errors.New("已关闭的工单不可编辑")
	}
	t.Title = req.Title
	t.Description = req.Description
	t.CustomerID = req.CustomerID
	t.CustomerName = req.CustomerName
	t.ContractID = req.ContractID
	t.ContactName = req.ContactName
	t.ContactPhone = req.ContactPhone
	t.Category = req.Category
	if req.Priority > 0 {
		t.Priority = req.Priority
	}
	t.HandlerID = req.HandlerID
	return s.repo.Update(ctx, t)
}

// ChangeStatusRequest 变更状态(含处理日志)。
type ChangeStatusRequest struct {
	Status   int8   `json:"status" binding:"required"`
	Solution string `json:"solution"`
	Comment  string `json:"comment"`
}

func (s *TicketService) ChangeStatus(ctx context.Context, id uint, req *ChangeStatusRequest, operatorID uint) error {
	t, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "工单不存在")
	}
	oldStatus := t.Status
	t.Status = req.Status
	if req.Status == crmmodel.TicketStatusResolved || req.Status == crmmodel.TicketStatusClosed {
		t.ResolvedAt = xtime.NewNullDateTimeFromTime(time.Now())
		if req.Solution != "" {
			t.Solution = req.Solution
		}
	}
	logContent := req.Comment
	if logContent == "" {
		logContent = req.Solution
	}
	if logContent == "" {
		logContent = "状态变更"
	}

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Update(ctx, t); err != nil {
			return err
		}
		log := &crmmodel.CrmTicketLog{
			TicketID:   id,
			Content:    logContent,
			OperatorID: operatorID,
			OldStatus:  oldStatus,
			NewStatus:  req.Status,
		}
		return s.logRepo.Create(ctx, log)
	})
}

func (s *TicketService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "工单不存在")
	}
	return s.repo.Delete(ctx, id)
}
