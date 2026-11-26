package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/mp/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// account.go 公众号账号管理(sys_api 900-903)。secret 出参脱敏、入参按空串/
// 掩码值保留原值的语义在 service 层处理,handler 只做参数绑定与信封。

// AccountHandler 公众号账号 Handler。
type AccountHandler struct {
	svc *service.AccountService
}

func NewAccountHandler() *AccountHandler {
	return &AccountHandler{svc: service.NewAccountService()}
}

// List GET /mp/accounts — 账号列表(secret 脱敏)。
func (h *AccountHandler) List(c *gin.Context) {
	list, err := h.svc.List(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list})
}

// Create POST /mp/accounts — 新建账号(app_secret 必填明文)。
func (h *AccountHandler) Create(c *gin.Context) {
	var req service.SaveAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	item, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, item)
}

// Update PUT /mp/accounts/:id — 更新账号(app_secret 空串/掩码值=保留原值)。
func (h *AccountHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var req service.SaveAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	item, err := h.svc.Update(c.Request.Context(), uint(id), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, item)
}

// Delete DELETE /mp/accounts/:id — 删除账号(软删)。
func (h *AccountHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
