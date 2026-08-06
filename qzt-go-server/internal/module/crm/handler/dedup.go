package handler

// dedup.go 客户/线索查重。
// 录入线索或客户时按 名称(模糊) / 电话(精确) 跨 线索+客户 两表检索相似记录,
// 防止重复录入。仅提示不拦截(同名客户/多联系人是合法场景)。

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/repository"
	response "qzt-go-server/pkg/xresponse"
)

// DedupHandler 查重查询。
type DedupHandler struct{}

func NewDedupHandler() *DedupHandler { return &DedupHandler{} }

// DedupLeadItem 相似线索(字段精简,够列表提示用)。
type DedupLeadItem struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	ContactName string `json:"contact_name"`
	Phone       string `json:"phone"`
	Company     string `json:"company"`
	Status      int8   `json:"status"`
	OwnerID     *uint  `json:"owner_id"`
}

// DedupCustomerItem 相似客户。
type DedupCustomerItem struct {
	ID         uint   `json:"id"`
	Name       string `json:"name"`
	CustomerNo string `json:"customer_no"`
	Status     int8   `json:"status"`
	OwnerID    *uint  `json:"owner_id"`
}

// Check 查重:名称模糊 + 电话精确,跨线索/客户两表。
// @Summary  客户/线索查重
// @Tags     CRM
// @Produce  json
// @Security BearerAuth
// @Param    name   query  string  false  "名称(模糊匹配:线索名称/联系人/公司、客户名称)"
// @Param    phone  query  string  false  "电话(精确匹配:线索电话、客户联系人电话)"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/dedup [get]
func (h *DedupHandler) Check(c *gin.Context) {
	name := c.Query("name")
	phone := c.Query("phone")
	if name == "" && phone == "" {
		response.Fail(c, errcode.ErrParam, "参数错误: name 和 phone 至少传一个")
		return
	}

	db := repository.DBFrom(c.Request.Context())
	leads := make([]DedupLeadItem, 0)
	customers := make([]DedupCustomerItem, 0)

	// ---- 线索:名称模糊(名称/联系人/公司) 或 电话精确 ----
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
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}

	// ---- 客户:名称模糊;电话精确则经联系人表关联 ----
	custQuery := db.Table("crm_customer").
		Select("crm_customer.id, crm_customer.name, crm_customer.customer_no, crm_customer.status, crm_customer.owner_id").
		Limit(5)
	if name != "" && phone != "" {
		custQuery = custQuery.Where("crm_customer.name LIKE ?", "%"+name+"%")
		// 电话精确命中的客户(联系人电话)与名称结果合并
		var phoneHits []DedupCustomerItem
		db.Table("crm_customer").
			Select("crm_customer.id, crm_customer.name, crm_customer.customer_no, crm_customer.status, crm_customer.owner_id").
			Joins("JOIN crm_customer_contact cc ON cc.customer_id = crm_customer.id AND cc.phone = ?", phone).
			Limit(5).
			Scan(&phoneHits)
		if err := custQuery.Scan(&customers).Error; err != nil {
			response.Fail(c, errcode.ErrServer, err.Error())
			return
		}
		customers = mergeCustomers(customers, phoneHits)
	} else if name != "" {
		if err := custQuery.Where("crm_customer.name LIKE ?", "%"+name+"%").Scan(&customers).Error; err != nil {
			response.Fail(c, errcode.ErrServer, err.Error())
			return
		}
	} else {
		if err := custQuery.
			Joins("JOIN crm_customer_contact cc ON cc.customer_id = crm_customer.id AND cc.phone = ?", phone).
			Scan(&customers).Error; err != nil {
			response.Fail(c, errcode.ErrServer, err.Error())
			return
		}
	}

	response.OK(c, gin.H{"leads": leads, "customers": customers})
}

// mergeCustomers 按 id 去重合并,总量截断到 5。
func mergeCustomers(a, b []DedupCustomerItem) []DedupCustomerItem {
	seen := make(map[uint]bool, len(a)+len(b))
	out := make([]DedupCustomerItem, 0, len(a)+len(b))
	for _, list := range [][]DedupCustomerItem{a, b} {
		for _, item := range list {
			if seen[item.ID] {
				continue
			}
			seen[item.ID] = true
			out = append(out, item)
		}
	}
	if len(out) > 5 {
		out = out[:5]
	}
	return out
}
