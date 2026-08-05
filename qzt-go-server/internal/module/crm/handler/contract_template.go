package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// contract_template.go 合同模板管理 + 套打渲染。
type ContractTemplateHandler struct {
	svc       *service.ContractTemplateService
	docSvc    *service.ContractDocumentService
}

func NewContractTemplateHandler() *ContractTemplateHandler {
	return &ContractTemplateHandler{
		svc:    service.NewContractTemplateService(),
		docSvc: service.NewContractDocumentService(),
	}
}

// Create 新增合同模板
// @Summary  新增合同模板
// @Tags     合同模板
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateContractTemplateRequest  true  "新增合同模板请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/contract-templates [post]
func (h *ContractTemplateHandler) Create(c *gin.Context) {
	var req service.CreateContractTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	t, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, t)
}

// Update 修改合同模板
// @Summary  修改合同模板
// @Tags     合同模板
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int                                  true  "模板ID"
// @Param    body  body      service.UpdateContractTemplateRequest  true  "修改合同模板请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/contract-templates/{id} [put]
func (h *ContractTemplateHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateContractTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除合同模板
// @Summary  删除合同模板
// @Tags     合同模板
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "模板ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contract-templates/{id} [delete]
func (h *ContractTemplateHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// GetByID 合同模板详情
// @Summary  合同模板详情(含正文)
// @Tags     合同模板
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "模板ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contract-templates/{id} [get]
func (h *ContractTemplateHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	t, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, t)
}

// List 合同模板列表
// @Summary  合同模板列表(name 模糊 + enabled 过滤,不含正文)
// @Tags     合同模板
// @Produce  json
// @Security BearerAuth
// @Param    keyword  query  string  false  "名称关键词"
// @Param    enabled  query  int     false  "1启用 0停用,不传查全部"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contract-templates [get]
func (h *ContractTemplateHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	keyword := c.Query("keyword")
	var enabled *int8
	if v := c.Query("enabled"); v != "" {
		e, _ := strconv.ParseInt(v, 10, 8)
		ev := int8(e)
		enabled = &ev
	}
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword, enabled)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// Variables 模板可用变量清单(供编辑器「插入变量」下拉)
// @Summary  模板可用变量清单
// @Tags     合同模板
// @Produce  json
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contract-templates/variables [get]
func (h *ContractTemplateHandler) Variables(c *gin.Context) {
	response.OK(c, service.VariableMetas())
}

// PrintDocument 套打渲染:用指定模板 + 合同数据生成 Markdown 文档
// @Summary  套打合同文档(选模板渲染)
// @Tags     合同管理
// @Produce  json
// @Security BearerAuth
// @Param    id           path  int  true  "合同ID"
// @Param    template_id  query int  true  "模板ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contracts/{id}/print-document [get]
func (h *ContractTemplateHandler) PrintDocument(c *gin.Context) {
	contractID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	templateID, err := strconv.ParseUint(c.Query("template_id"), 10, 64)
	if err != nil || templateID == 0 {
		response.Fail(c, errcode.ErrParam, "template_id 必填")
		return
	}
	md, err := h.docSvc.Render(c.Request.Context(), uint(contractID), uint(templateID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"markdown": md})
}
