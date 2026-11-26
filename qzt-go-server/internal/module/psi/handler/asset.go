package handler

import (
	"errors"
	"io"
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/psi/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// asset.go 固定资产 handler。

type AssetHandler struct {
	svc *service.AssetService
}

func NewAssetHandler() *AssetHandler { return &AssetHandler{svc: service.NewAssetService()} }

// firstNonEmpty 返回第一个非空串(列表筛选参数兜底用)。
func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func (h *AssetHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	ownerID, _ := strconv.ParseUint(c.Query("owner_id"), 10, 64)
	deptID, _ := strconv.ParseUint(c.Query("dept_id"), 10, 64)
	keyword := firstNonEmpty(c.Query("keyword"), c.Query("asset_no"), c.Query("name"))
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword, c.Query("category"), int8(status), uint(ownerID), uint(deptID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

func (h *AssetHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	a, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, a)
}

func (h *AssetHandler) Create(c *gin.Context) {
	var req service.CreateAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	a, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, a)
}

func (h *AssetHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateAssetRequest
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

func (h *AssetHandler) Delete(c *gin.Context) {
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

// DepreciateRun 手动折旧计提
// @Summary      手动折旧计提
// @Description  直线法按期计提;period 不传=当前日历月,格式 YYYY-MM;(asset_id,period) 唯一索引保证幂等
// @Tags         固定资产
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  object  false  "{period: \"2026-11\"}(可省略)"
// @Success      200  {object}  xresponse.Response
// @Router       /psi/assets/depreciate/run [post]
func (h *AssetHandler) DepreciateRun(c *gin.Context) {
	var req struct {
		Period string `json:"period"`
	}
	if err := c.ShouldBindJSON(&req); err != nil && !errors.Is(err, io.EOF) {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	stats, err := service.RunDepreciation(c.Request.Context(), req.Period)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, stats)
}

// DepreciationLogs 资产折旧计提日志
// @Summary      资产折旧计提日志
// @Description  某资产的逐期折旧计提记录(期间升序)
// @Tags         固定资产
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /psi/assets/:id/depreciation-logs [get]
func (h *AssetHandler) DepreciationLogs(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.Fail(c, errcode.ErrParam, "id 无效")
		return
	}
	list, err := service.ListDepreciationLogs(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}
