package handler

import (
	"github.com/gin-gonic/gin"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// CustomFieldHandler 自定义字段配置管理。
type CustomFieldHandler struct {
	svc *service.CustomFieldService
}

func NewCustomFieldHandler() *CustomFieldHandler {
	return &CustomFieldHandler{svc: service.NewCustomFieldService()}
}

// ListFields 列出某表单的全部字段
// @Summary  列出自定义字段
// @Tags     自定义字段
// @Produce  json
// @Security BearerAuth
// @Param    form_key  query  string  true  "表单key(如 CUSTOMER)"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/custom-fields [get]
func (h *CustomFieldHandler) ListFields(c *gin.Context) {
	formKey := crmmodel.FormKey(c.Query("form_key"))
	if formKey == "" {
		response.Fail(c, errcode.ErrParam, "参数错误: form_key 不能为空")
		return
	}
	list, err := h.svc.ListFields(c.Request.Context(), formKey)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// CreateField 新增字段定义
// @Summary  新增自定义字段
// @Tags     自定义字段
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateFieldRequest  true  "创建字段请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/custom-fields [post]
func (h *CustomFieldHandler) CreateField(c *gin.Context) {
	var req service.CreateFieldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.CreateField(c.Request.Context(), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// UpdateField 更新字段定义
// @Summary  更新自定义字段
// @Tags     自定义字段
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      string  true  "字段ID"
// @Param    body  body      service.UpdateFieldRequest  true  "更新字段请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/custom-fields/{id} [put]
func (h *CustomFieldHandler) UpdateField(c *gin.Context) {
	fieldID := c.Param("id")
	if fieldID == "" {
		response.Fail(c, errcode.ErrParam, "参数错误: id 不能为空")
		return
	}
	var req service.UpdateFieldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdateField(c.Request.Context(), fieldID, &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeleteField 删除字段定义
// @Summary  删除自定义字段
// @Tags     自定义字段
// @Produce  json
// @Security BearerAuth
// @Param    id  path      string  true  "字段ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/custom-fields/{id} [delete]
func (h *CustomFieldHandler) DeleteField(c *gin.Context) {
	fieldID := c.Param("id")
	if fieldID == "" {
		response.Fail(c, errcode.ErrParam, "参数错误: id 不能为空")
		return
	}
	if err := h.svc.DeleteField(c.Request.Context(), fieldID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
