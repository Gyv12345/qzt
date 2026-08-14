package crm

import (
	"database/sql"
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/pkg/datascope"
	"qzt-go-server/pkg/xresponse"
)

// DataScopeGuard 单记录数据权限守卫。
//
// 列表查询由 service 层 datascope.BuildCond 注入过滤,但按 id 直取的接口
// (详情/子资源/更新/删除)此前不做数据权限校验,任何拿到 id 的登录用户都可
// 越权读写他人名下的客户/线索/商机/合同及其子数据(详情接口 IDOR)。
// 本中间件在进入 handler 前沿 ownerRefs 解析记录最终归属人,再按 datascope
// 校验,不通过直接 403。
//
// 记录不存在、外键为空(如公海客户 owner_id 为 NULL)或 id 参数非法时不拦截,
// 交由 handler 按原逻辑返回 404/参数错误——公海无主数据本就对可见角色开放。
func DataScopeGuard(kind string) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := parseID(c)
		if id == 0 {
			c.Next()
			return
		}
		owner, ok := resolveOwner(kind, id)
		if !ok {
			c.Next()
			return
		}
		if !datascope.CanAccessOwner(c.Request.Context(), owner) {
			xresponse.Forbidden(c, "无权访问该数据")
			return
		}
		c.Next()
	}
}

// parseID 取路径参数 id(合同明细等路由参数名为 itemId)。
func parseID(c *gin.Context) uint {
	raw := c.Param("id")
	if raw == "" {
		raw = c.Param("itemId")
	}
	v, err := strconv.ParseUint(raw, 10, 64)
	if err != nil {
		return 0
	}
	return uint(v)
}

// ownerRef 记录归属解析规则:从 table 取 col 列;next 非空表示 col 是
// 指向下一实体的外键,需继续沿链解析,直到取到最终 owner_id。
type ownerRef struct {
	table string
	col   string
	next  string
}

var ownerRefs = map[string]ownerRef{
	"customer":        {"crm_customer", "owner_id", ""},
	"lead":            {"crm_lead", "owner_id", ""},
	"opportunity":     {"crm_opportunity", "owner_id", ""},
	"contract":        {"crm_contract", "owner_id", ""},
	"contact":         {"crm_customer_contact", "customer_id", "customer"},
	"collaboration":   {"crm_customer_collaboration", "customer_id", "customer"},
	"follow_record":   {"follow_up_record", "customer_id", "customer"},
	"follow_plan":     {"follow_up_plan", "customer_id", "customer"},
	"payment_plan":    {"crm_contract_payment_plan", "contract_id", "contract"},
	"payment_record":  {"crm_contract_payment_record", "contract_id", "contract"},
	"contract_item":   {"crm_contract_item", "contract_id", "contract"},
}

// resolveOwner 沿外键链解析记录最终归属人;记录不存在、列为 NULL 或链断裂
// 返回 ok=false(由调用方放行,handler 自行 404)。
func resolveOwner(kind string, id uint) (uint, bool) {
	for range 5 {
		ref, ok := ownerRefs[kind]
		if !ok {
			return 0, false
		}
		var val sql.NullInt64
		if err := app.DB.Table(ref.table).Select(ref.col).
			Where("id = ?", id).Scan(&val).Error; err != nil || !val.Valid {
			return 0, false
		}
		if ref.next == "" {
			return uint(val.Int64), true
		}
		kind, id = ref.next, uint(val.Int64)
	}
	return 0, false
}
