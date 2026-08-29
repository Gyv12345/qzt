package crm

import (
	"database/sql"
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/module/system/errcode"
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

// queryOwnerGuard 「按 query 参数指定资源」的数据权限守卫工厂。
//
// 适用于资源不是路径 id 而是 query 参数的只读接口(如时间线 field=value、
// 字段变更 biz_type+resource_id):fieldMap 把客户端传入的资源标识映射到
// ownerRefs 的 kind,守卫解析最终归属人后按 datascope 校验,不通过 403。
// 资源标识不在 fieldMap 内直接 400(白名单,兼防任意列名探测);id 参数
// 缺失/非法时不拦截,交由 handler 返回参数错误——守卫只管权限不管必填。
func queryOwnerGuard(fieldMap map[string]string, fieldParam, idParam string) gin.HandlerFunc {
	return func(c *gin.Context) {
		kind, ok := fieldMap[c.Query(fieldParam)]
		if !ok {
			xresponse.Fail(c, errcode.ErrParam, "参数错误: "+fieldParam+" 无效")
			c.Abort()
			return
		}
		raw := c.Query(idParam)
		if raw == "" {
			c.Next()
			return
		}
		v, err := strconv.ParseUint(raw, 10, 64)
		if err != nil || v == 0 {
			c.Next()
			return
		}
		owner, ok := resolveOwner(kind, uint(v))
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

// timelineFieldKinds 时间线接口 field 参数白名单:列名 → 归属解析 kind。
var timelineFieldKinds = map[string]string{
	"lead_id":        "lead",
	"customer_id":    "customer",
	"opportunity_id": "opportunity",
	"contact_id":     "contact",
	"contract_id":    "contract",
}

// TimelineOwnerGuard 跟进记录时间线数据权限守卫(field+value)。
func TimelineOwnerGuard() gin.HandlerFunc {
	return queryOwnerGuard(timelineFieldKinds, "field", "value")
}

// changeBizKinds 字段变更历史 biz_type 白名单:CUSTOMER 等 → 归属解析 kind。
var changeBizKinds = map[string]string{
	"CUSTOMER":    "customer",
	"LEAD":        "lead",
	"OPPORTUNITY": "opportunity",
	"CONTRACT":    "contract",
}

// ChangeLogOwnerGuard 字段变更历史数据权限守卫(biz_type+resource_id)。
func ChangeLogOwnerGuard() gin.HandlerFunc {
	return queryOwnerGuard(changeBizKinds, "biz_type", "resource_id")
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
	"customer":       {"crm_customer", "owner_id", ""},
	"lead":           {"crm_lead", "owner_id", ""},
	"opportunity":    {"crm_opportunity", "owner_id", ""},
	"contract":       {"crm_contract", "owner_id", ""},
	"contact":        {"crm_customer_contact", "customer_id", "customer"},
	"follow_record":  {"follow_up_record", "customer_id", "customer"},
	"follow_plan":    {"follow_up_plan", "customer_id", "customer"},
	"payment_plan":   {"crm_contract_payment_plan", "contract_id", "contract"},
	"payment_record": {"crm_contract_payment_record", "contract_id", "contract"},
	"contract_item":  {"crm_contract_item", "contract_id", "contract"},
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
