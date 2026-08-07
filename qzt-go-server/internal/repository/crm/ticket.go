package crm

import (
	"context"

	"gorm.io/gorm"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// ticket.go 售后工单 repository。

func ticketDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }

type TicketRepo struct {
	repository.BaseRepo[crmmodel.CrmTicket]
}

func NewTicketRepo() *TicketRepo { return &TicketRepo{} }

func (r *TicketRepo) PageList(ctx context.Context, page, pageSize int, keyword, category string, status, priority int8, customerID, handlerID uint) ([]crmmodel.CrmTicket, int64, error) {
	var list []crmmodel.CrmTicket
	q := ticketDB(ctx).Model(&crmmodel.CrmTicket{})
	if keyword != "" {
		q = q.Where("title LIKE ? OR ticket_no LIKE ? OR customer_name LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	if category != "" {
		q = q.Where("category = ?", category)
	}
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	if priority > 0 {
		q = q.Where("priority = ?", priority)
	}
	if customerID > 0 {
		q = q.Where("customer_id = ?", customerID)
	}
	if handlerID > 0 {
		q = q.Where("handler_id = ?", handlerID)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *TicketRepo) Update(ctx context.Context, m *crmmodel.CrmTicket) error {
	return r.BaseRepo.Update(ctx, m, "Title", "Description", "CustomerID", "CustomerName", "ContractID", "ContactName", "ContactPhone", "Category", "Priority", "Status", "HandlerID", "Solution", "ResolvedAt")
}

// ── 工单日志 ──

type TicketLogRepo struct {
	repository.BaseRepo[crmmodel.CrmTicketLog]
}

func NewTicketLogRepo() *TicketLogRepo { return &TicketLogRepo{} }

func (r *TicketLogRepo) ListByTicket(ctx context.Context, ticketID uint) ([]crmmodel.CrmTicketLog, error) {
	var list []crmmodel.CrmTicketLog
	err := ticketDB(ctx).Where("ticket_id = ?", ticketID).Order("id ASC").Find(&list).Error
	return list, err
}
