package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// TianyanchaHandler 客户工商信息查询(天眼查 MCP,P31 Feature B)。
type TianyanchaHandler struct {
	svc *service.TianyanchaService
}

func NewTianyanchaHandler() *TianyanchaHandler {
	return &TianyanchaHandler{svc: service.NewTianyanchaService()}
}

// QueryByCustomer 查询客户工商信息
// @Summary      客户工商信息查询(天眼查)
// @Description  按客户名称经天眼查 MCP 查询工商信息并归一化返回;不回填客户字段,
//               仅前端展示。?name= 覆盖客户名称;?save=1 时把结果摘要写一条跟进
//               记录留痕。天眼查未配置/未启用明确报错;全局每日配额(默认 300 次)
//               超限报错提示明日再试。
// @Tags         客户管理
// @Produce      json
// @Security     BearerAuth
// @Param        id    path   int     true  "客户ID"
// @Param        name  query  string  false "企业名称(留空用客户名称)"
// @Param        save  query  bool    false "是否写跟进记录留痕(默认 false)"
// @Success      200  {object}  xresponse.Response
// @Router       /crm/customers/{id}/tianyancha [get]
func (h *TianyanchaHandler) QueryByCustomer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	save := c.Query("save") == "1" || c.Query("save") == "true"
	info, err := h.svc.QueryByCustomer(c.Request.Context(), middleware.GetUserID(c),
		uint(id), c.Query("name"), save)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, info)
}
