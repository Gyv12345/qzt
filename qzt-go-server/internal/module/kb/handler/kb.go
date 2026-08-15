package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/module/kb/service"
	"qzt-go-server/internal/repository"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
	"qzt-go-server/pkg/xlogger"
)

// ── 分类 Handler ──

type CategoryHandler struct {
	svc *service.CategoryService
}

func NewCategoryHandler() *CategoryHandler { return &CategoryHandler{svc: service.NewCategoryService()} }

func (h *CategoryHandler) List(c *gin.Context) {
	list, err := h.svc.ListAll(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list})
}

func (h *CategoryHandler) Create(c *gin.Context) {
	var req service.CreateKbCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	cat, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, cat)
}

func (h *CategoryHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var req service.CreateKbCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Update(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

func (h *CategoryHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ── 文档 Handler ──

type DocumentHandler struct {
	svc *service.DocumentService
}

func NewDocumentHandler() *DocumentHandler { return &DocumentHandler{svc: service.NewDocumentService()} }

func (h *DocumentHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	categoryID, _ := strconv.ParseUint(c.Query("category_id"), 10, 64)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, uint(categoryID), c.Query("keyword"), c.Query("status"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

func (h *DocumentHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	doc, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, doc)
}

func (h *DocumentHandler) Create(c *gin.Context) {
	var req service.CreateDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	doc, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, doc)
}

func (h *DocumentHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var req service.UpdateDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Update(c.Request.Context(), uint(id), &req, middleware.GetUserID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

func (h *DocumentHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ── 版本 Handler ──

type VersionHandler struct {
	svc *service.VersionService
}

func NewVersionHandler() *VersionHandler { return &VersionHandler{svc: service.NewVersionService()} }

func (h *VersionHandler) List(c *gin.Context) {
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	p := syservice.GetPagination(c)
	list, total, err := h.svc.ListVersions(c.Request.Context(), uint(docID), p.Page, p.PageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

func (h *VersionHandler) Restore(c *gin.Context) {
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	versionID, _ := strconv.ParseUint(c.Param("versionId"), 10, 64)
	if err := h.svc.Restore(c.Request.Context(), uint(docID), uint(versionID), middleware.GetUserID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ── 协同编辑 WebSocket Handler ──

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type CollabHandler struct{}

func NewCollabHandler() *CollabHandler { return &CollabHandler{} }

// HandleCollab GET /kb/documents/:id/collab — WebSocket 协同编辑
func (h *CollabHandler) HandleCollab(c *gin.Context) {
	docID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}

	// JWT 完整校验(WebSocket 不走中间件链,手动补齐 JWTAuth 的三重失效
	// 校验:Redis 黑名单 + access token 类型 + token_version/账号状态),
	// 并把连接身份绑定到 token claims——本路由未经鉴权中间件,gin context
	// 里没有 user_id,此前取值恒为 0,连接身份与 token 脱钩。
	token := c.Query("token")
	if token == "" {
		c.String(http.StatusUnauthorized, "未认证")
		return
	}
	if cache.IsTokenBlacklisted(token) {
		c.String(http.StatusUnauthorized, "Token 已失效")
		return
	}
	claims, err := app.JwtManager.ParseToken(token)
	if err != nil {
		c.String(http.StatusUnauthorized, "Token 无效")
		return
	}
	if err := claims.ValidAccessToken(); err != nil {
		c.String(http.StatusUnauthorized, "Token 类型错误")
		return
	}
	wsUser, err := repository.NewUserRepo().GetByID(c.Request.Context(), uint(claims.UserId))
	if err != nil || wsUser.TokenVersion != claims.TokenVersion || wsUser.Status != 1 {
		c.String(http.StatusUnauthorized, "登录状态已失效")
		return
	}
	userID := uint(claims.UserId)

	conn, err := wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		xlogger.ErrorfCtx(c.Request.Context(), "kb collab ws upgrade error: %v", err)
		return
	}
	defer conn.Close()

	dID := uint(docID)
	service.GlobalCollab.Join(dID, conn)
	defer service.GlobalCollab.Leave(dID, conn)

	xlogger.InfofCtx(c.Request.Context(), "kb collab: user %d joined doc %d", userID, dID)

	for {
		msgType, data, err := conn.ReadMessage()
		if err != nil {
			break
		}

		// 区分消息类型:文本消息(JSON 控制消息) vs 二进制(Yjs update)
		if msgType == websocket.TextMessage {
			// 文本消息:保存快照指令
			content := string(data)
			if len(content) > 0 && content[0] == '{' {
				// 可能是 save 指令,先简单处理:内容即 HTML 快照
				service.SaveSnapshot(c.Request.Context(), dID, userID, content)
			}
		}

		// 广播给房间内其他连接
		service.GlobalCollab.Broadcast(dID, conn, msgType, data)
	}

	xlogger.InfofCtx(c.Request.Context(), "kb collab: user %d left doc %d", userID, dID)
}
