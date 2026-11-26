package service

import (
	"context"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/datascope"
	"qzt-go-server/internal/repository"
	crmrepo "qzt-go-server/internal/repository/crm"
)

// follow_todo.go 工作台「今日跟进」:调用人自己的待办计划按到期窗口汇总,
// 回答「今天先做什么」——已逾期的排最前,其次是今天到期。
//
// 数据口径:只取 owner_id = 调用人 且 status=待办 的计划,与 /crm/follow-plans/my-todos
// 同源;区别是这里按日期窗口分桶并限量(my-todos 一次返回全部未完成计划,不分早晚)。
// 关联客户/线索的名称只在调用人有对应路由权限且数据范围内可读时才带出,否则留空
// (前端回退显示 #id),与跟进计划页按可见客户映射名称的口径一致。

// followTodoListLimit 列表最多返回条数(已逾期 + 今日到期,按计划时间升序)。
const followTodoListLimit = 6

// FollowTodoItem 待办计划行。
type FollowTodoItem struct {
	ID      uint   `json:"id"`
	Type    string `json:"type"`
	Content string `json:"content"`
	// PlanTime 计划时间 YYYY-MM-DD HH:mm
	PlanTime string `json:"plan_time"`
	// Due 到期桶:overdue=已逾期 today=今日到期
	Due          string `json:"due"`
	CustomerID   uint   `json:"customer_id,omitempty"`
	CustomerName string `json:"customer_name,omitempty"`
	LeadID       uint   `json:"lead_id,omitempty"`
	LeadName     string `json:"lead_name,omitempty"`
}

// FollowTodoSummary 调用人待办计划概览。
type FollowTodoSummary struct {
	Today    int64            `json:"today"`    // 今日到期
	Overdue  int64            `json:"overdue"`  // 已逾期
	Upcoming int64            `json:"upcoming"` // 今日之后
	List     []FollowTodoItem `json:"list"`
}

// FollowTodos 汇总调用人的待办计划。
func FollowTodos(ctx context.Context, userID uint, roleCodes []string) (*FollowTodoSummary, error) {
	today := truncateDay(time.Now())
	tomorrow := today.AddDate(0, 0, 1)
	planRepo := crmrepo.NewFollowUpPlanRepo()
	todo := map[string]any{"owner_id": userID, "status": crmmodel.PlanStatusTodo}

	plans, dueTotal, err := planRepo.PageList(ctx, 1, followTodoListLimit, &repository.QueryOptions{
		Where: todo,
		Conds: []repository.Cond{{Query: "plan_time < ?", Args: []any{tomorrow}}},
		Order: []string{"plan_time ASC"},
	})
	if err != nil {
		return nil, err
	}
	overdue, err := planRepo.Count(ctx, &repository.QueryOptions{
		Where: todo,
		Conds: []repository.Cond{{Query: "plan_time < ?", Args: []any{today}}},
	})
	if err != nil {
		return nil, err
	}
	upcoming, err := planRepo.Count(ctx, &repository.QueryOptions{
		Where: todo,
		Conds: []repository.Cond{{Query: "plan_time >= ?", Args: []any{tomorrow}}},
	})
	if err != nil {
		return nil, err
	}

	customerNames, leadNames := linkedNames(ctx, plans, roleCodes)
	out := &FollowTodoSummary{
		Today:    dueTotal - overdue,
		Overdue:  overdue,
		Upcoming: upcoming,
		List:     make([]FollowTodoItem, 0, len(plans)),
	}
	for _, p := range plans {
		item := FollowTodoItem{
			ID:       p.ID,
			Type:     p.Type,
			Content:  p.Content,
			PlanTime: p.PlanTime.Time().Format("2006-01-02 15:04"),
			Due:      followDue(p.PlanTime.Time(), today),
		}
		if p.CustomerID != nil {
			item.CustomerID = *p.CustomerID
			item.CustomerName = customerNames[*p.CustomerID]
		}
		if p.LeadID != nil {
			item.LeadID = *p.LeadID
			item.LeadName = leadNames[*p.LeadID]
		}
		out.List = append(out.List, item)
	}
	return out, nil
}

// followDue 到期桶:计划时间早于今日 0 点为已逾期,否则为今日到期。
func followDue(planTime, today time.Time) string {
	if planTime.Before(today) {
		return "overdue"
	}
	return "today"
}

// linkedNames 批量取计划关联的客户/线索名称(id → 名称)。
// 没有对应路由权限时直接返回空映射;有权限时再按数据范围逐条过滤,
// 读不到的客户/线索不进映射(名称留空)。查询失败按空映射处理,不影响计划本身。
func linkedNames(ctx context.Context, plans []crmmodel.FollowUpPlan, roleCodes []string) (customers, leads map[uint]string) {
	customers, leads = map[uint]string{}, map[uint]string{}
	customerIDs := make([]uint, 0, len(plans))
	leadIDs := make([]uint, 0, len(plans))
	for _, p := range plans {
		if p.CustomerID != nil {
			customerIDs = append(customerIDs, *p.CustomerID)
		}
		if p.LeadID != nil {
			leadIDs = append(leadIDs, *p.LeadID)
		}
	}

	if len(customerIDs) > 0 && canReadPath(roleCodes, rbacPathCustomer) {
		if rows, err := crmrepo.NewCustomerRepo().List(ctx, &repository.QueryOptions{
			Conds: []repository.Cond{{Query: "id IN ?", Args: []any{customerIDs}}},
		}); err == nil {
			for _, c := range rows {
				if datascope.CanAccessOwner(ctx, ownerIDOf(c.OwnerID)) {
					customers[c.ID] = c.Name
				}
			}
		}
	}
	if len(leadIDs) > 0 && canReadPath(roleCodes, rbacPathLead) {
		if rows, err := crmrepo.NewLeadRepo().List(ctx, &repository.QueryOptions{
			Conds: []repository.Cond{{Query: "id IN ?", Args: []any{leadIDs}}},
		}); err == nil {
			for _, l := range rows {
				if datascope.CanAccessOwner(ctx, ownerIDOf(l.OwnerID)) {
					leads[l.ID] = l.Name
				}
			}
		}
	}
	return customers, leads
}
