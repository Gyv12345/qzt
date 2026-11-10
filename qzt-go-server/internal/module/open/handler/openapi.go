// openapi.go 开放 API(/open/v1/*) handler。
package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/open/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// OpenAPIHandler 开放端点。
type OpenAPIHandler struct {
	svc *service.OpenAPIService
}

func NewOpenAPIHandler() *OpenAPIHandler {
	return &OpenAPIHandler{svc: service.NewOpenAPIService()}
}

// Events 事件目录
// @Summary  事件目录(开放)
// @Description  返回平台出站事件目录,供订阅方(OA/外部系统)对齐契约
// @Tags     开放集成
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /open/v1/events [get]
func (h *OpenAPIHandler) Events(c *gin.Context) {
	response.OK(c, h.svc.Events())
}

// OrgTree 组织树
// @Summary  组织树(开放)
// @Description  hrm 部门树透出,供 OA 系统做组织同步
// @Tags     开放集成
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /open/v1/org/tree [get]
func (h *OpenAPIHandler) OrgTree(c *gin.Context) {
	tree, err := h.svc.OrgTree(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, tree)
}
