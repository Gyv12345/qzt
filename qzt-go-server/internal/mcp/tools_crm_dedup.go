package mcp

import (
	"context"
	"fmt"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"qzt-go-server/internal/repository"
)

// tools_crm_dedup.go CRM 客户/线索查重 tool。

func registerCrmDedupTools(s *server.MCPServer) {
	// ── 查重 ──
	s.AddTool(
		mcp.NewTool("crm_dedup",
			mcp.WithDescription("客户/线索查重:名称模糊匹配(线索名称/联系人/公司、客户名称)+电话精确匹配(线索电话、客户联系人电话),跨线索和客户两表检索相似记录。录入前建议先查重"),
			mcp.WithString("name", mcp.Description("名称(模糊)")),
			mcp.WithString("phone", mcp.Description("电话(精确)")),
		),
		handleCrmDedup,
	)
}

// ── 查重 handler ──

type dedupLeadItem struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	ContactName string `json:"contact_name"`
	Phone       string `json:"phone"`
	Company     string `json:"company"`
	Status      int8   `json:"status"`
	OwnerID     *uint  `json:"owner_id"`
}

type dedupCustomerItem struct {
	ID         uint   `json:"id"`
	Name       string `json:"name"`
	CustomerNo string `json:"customer_no"`
	Status     int8   `json:"status"`
	OwnerID    *uint  `json:"owner_id"`
}

func handleCrmDedup(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	name := strings.TrimSpace(req.GetString("name", ""))
	phone := strings.TrimSpace(req.GetString("phone", ""))
	if name == "" && phone == "" {
		return resultError("name 和 phone 至少传一个")
	}

	db := repository.DBFrom(ctx)
	leads := make([]dedupLeadItem, 0)
	customers := make([]dedupCustomerItem, 0)

	// 线索:名称模糊(名称/联系人/公司) 或 电话精确
	leadQuery := db.Table("crm_lead").
		Select("id, name, contact_name, phone, company, status, owner_id").
		Limit(5)
	if name != "" && phone != "" {
		leadQuery = leadQuery.Where(
			"name LIKE ? OR contact_name LIKE ? OR company LIKE ? OR phone = ?",
			"%"+name+"%", "%"+name+"%", "%"+name+"%", phone)
	} else if name != "" {
		leadQuery = leadQuery.Where(
			"name LIKE ? OR contact_name LIKE ? OR company LIKE ?",
			"%"+name+"%", "%"+name+"%", "%"+name+"%")
	} else {
		leadQuery = leadQuery.Where("phone = ?", phone)
	}
	if err := leadQuery.Scan(&leads).Error; err != nil {
		return resultError(fmt.Sprintf("查重失败: %v", err))
	}

	// 客户:名称模糊;电话精确则经联系人表关联合并
	custCols := "crm_customer.id, crm_customer.name, crm_customer.customer_no, crm_customer.status, crm_customer.owner_id"
	if name != "" {
		if err := db.Table("crm_customer").Select(custCols).
			Where("crm_customer.name LIKE ?", "%"+name+"%").Limit(5).
			Scan(&customers).Error; err != nil {
			return resultError(fmt.Sprintf("查重失败: %v", err))
		}
	}
	if phone != "" {
		phoneHits := make([]dedupCustomerItem, 0)
		if err := db.Table("crm_customer").Select(custCols).
			Joins("JOIN crm_customer_contact cc ON cc.customer_id = crm_customer.id AND cc.phone = ?", phone).
			Limit(5).Scan(&phoneHits).Error; err != nil {
			return resultError(fmt.Sprintf("查重失败: %v", err))
		}
		seen := make(map[uint]bool, len(customers)+len(phoneHits))
		merged := make([]dedupCustomerItem, 0, len(customers)+len(phoneHits))
		for _, list := range [][]dedupCustomerItem{customers, phoneHits} {
			for _, item := range list {
				if seen[item.ID] {
					continue
				}
				seen[item.ID] = true
				merged = append(merged, item)
			}
		}
		customers = merged
		if len(customers) > 5 {
			customers = customers[:5]
		}
	}

	return resultText(map[string]any{
		"leads":     leads,
		"customers": customers,
		"hint":      "若存在相似记录,建议先核对再决定是否新建",
	})
}
