package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/mp/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// menu.go 公众号自定义菜单管理(sys_api 911-913):读当前线上菜单 / 保存并发布 / 删除。

// MenuHandler 公众号菜单 Handler。
type MenuHandler struct {
	svc *service.MenuService
}

func NewMenuHandler() *MenuHandler {
	return &MenuHandler{svc: service.NewMenuService()}
}

// Get GET /mp/accounts/:id/menu — 拉取当前线上生效菜单。
func (h *MenuHandler) Get(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	open, buttons, err := h.svc.Get(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"is_menu_open": open, "buttons": buttons})
}

// Save PUT /mp/accounts/:id/menu — 校验并全量保存发布菜单。
func (h *MenuHandler) Save(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var req service.SaveMenuRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Save(c.Request.Context(), uint(id), req.Buttons); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete DELETE /mp/accounts/:id/menu — 删除线上菜单。
func (h *MenuHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
