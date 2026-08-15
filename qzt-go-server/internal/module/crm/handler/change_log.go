package handler

// change_log.go 字段变更历史查询。
// sys_field_change_log 是 append-only 多态表,记录 CRM 四大实体(客户/线索/商机/合同)
// 的字段变更。本接口按 biz_type + resource_id 倒序返回最近 100 条变更。

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/repository"
	response "qzt-go-server/pkg/xresponse"
)

// ChangeLogHandler 字段变更历史查询。
type ChangeLogHandler struct{}

func NewChangeLogHandler() *ChangeLogHandler {
	return &ChangeLogHandler{}
}

// List 按业务类型 + 资源ID 查询字段变更历史(倒序,最近 100 条)。
// @Summary  字段变更历史
// @Tags     CRM
// @Produce  json
// @Security BearerAuth
// @Param    biz_type     query  string  true  "业务类型(CUSTOMER/LEAD/OPPORTUNITY/CONTRACT)"
// @Param    resource_id  query  int     true  "资源ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/field-changes [get]
func (h *ChangeLogHandler) List(c *gin.Context) {
	bizType := c.Query("biz_type")
	// 白名单兜底:路由已挂 ChangeLogOwnerGuard,这里再挡一层,
	// 防止任意 biz_type 直查多态表泄露他人记录的字段历史。
	switch bizType {
	case "CUSTOMER", "LEAD", "OPPORTUNITY", "CONTRACT":
	default:
		response.Fail(c, errcode.ErrParam, "参数错误: biz_type 无效")
		return
	}
	resourceID, err := strconv.ParseUint(c.Query("resource_id"), 10, 64)
	if err != nil || resourceID == 0 {
		response.Fail(c, errcode.ErrParam, "参数错误: resource_id 必填且为正整数")
		return
	}

	// make(..., 0) 保证无记录时序列化为 [] 而不是 null,前端可直接迭代。
	logs := make([]model.SysFieldChangeLog, 0)
	if err := repository.DBFrom(c.Request.Context()).
		Where("biz_type = ? AND resource_id = ?", bizType, resourceID).
		Order("created_at DESC, id DESC").
		Limit(100).
		Find(&logs).Error; err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, logs)
}
