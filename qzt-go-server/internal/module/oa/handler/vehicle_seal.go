package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/oa/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// vehicle_seal.go OA 用车/印章 handler。

type VehicleHandler struct {
	svc *service.VehicleService
}

func NewVehicleHandler() *VehicleHandler { return &VehicleHandler{svc: service.NewVehicleService()} }

// List 车辆列表
// @Summary      车辆列表
// @Tags         OA-用车
// @Produce      json
// @Security     BearerAuth
// @Param        page        query  int     false  "页码"
// @Param        page_size   query  int     false  "每页条数"
// @Param        plate_no    query  string  false  "车牌号(模糊)"
// @Param        status      query  string  false  "状态(IDLE/IN_USE/MAINTENANCE/DISABLED)"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/vehicles [get]
func (h *VehicleHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize,
		c.Query("plate_no"), c.Query("status"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 车辆详情
// @Summary      车辆详情
// @Tags         OA-用车
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "车辆ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/vehicles/{id} [get]
func (h *VehicleHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	vehicle, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, vehicle)
}

// Create 新建车辆
// @Summary      新建车辆
// @Tags         OA-用车
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateVehicleRequest  true  "车辆"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/vehicles [post]
func (h *VehicleHandler) Create(c *gin.Context) {
	var req service.CreateVehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	vehicle, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, vehicle)
}

// Update 编辑车辆
// @Summary      编辑车辆
// @Tags         OA-用车
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "车辆ID"
// @Param        body  body  service.UpdateVehicleRequest  true  "车辆"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/vehicles/{id} [put]
func (h *VehicleHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateVehicleRequest
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

// Delete 删除车辆
// @Summary      删除车辆
// @Tags         OA-用车
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "车辆ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/vehicles/{id} [delete]
func (h *VehicleHandler) Delete(c *gin.Context) {
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

type VehicleApplicationHandler struct {
	svc *service.VehicleApplicationService
}

func NewVehicleApplicationHandler() *VehicleApplicationHandler {
	return &VehicleApplicationHandler{svc: service.NewVehicleApplicationService()}
}

// List 用车申请列表
// @Summary      用车申请列表
// @Tags         OA-用车
// @Produce      json
// @Security     BearerAuth
// @Param        page             query  int     false  "页码"
// @Param        page_size        query  int     false  "每页条数"
// @Param        application_no   query  string  false  "申请单号(模糊)"
// @Param        title            query  string  false  "标题(模糊)"
// @Param        applicant_id     query  int     false  "申请人ID"
// @Param        approval_status  query  string  false  "审批状态"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/vehicle-applications [get]
func (h *VehicleApplicationHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	applicantID, _ := strconv.ParseUint(c.Query("applicant_id"), 10, 64)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize,
		c.Query("application_no"), c.Query("title"), c.Query("approval_status"), uint(applicantID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 用车申请详情
// @Summary      用车申请详情
// @Tags         OA-用车
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "用车申请ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/vehicle-applications/{id} [get]
func (h *VehicleApplicationHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	app, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, app)
}

// Create 新建用车申请
// @Summary      新建用车申请
// @Tags         OA-用车
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateVehicleApplicationRequest  true  "用车申请"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/vehicle-applications [post]
func (h *VehicleApplicationHandler) Create(c *gin.Context) {
	var req service.CreateVehicleApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	app, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, app)
}

// Update 编辑用车申请
// @Summary      编辑用车申请
// @Tags         OA-用车
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "用车申请ID"
// @Param        body  body  service.UpdateVehicleApplicationRequest  true  "用车申请"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/vehicle-applications/{id} [put]
func (h *VehicleApplicationHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateVehicleApplicationRequest
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

// Delete 删除用车申请
// @Summary      删除用车申请
// @Tags         OA-用车
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "用车申请ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/vehicle-applications/{id} [delete]
func (h *VehicleApplicationHandler) Delete(c *gin.Context) {
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

// Return 归还车辆
// @Summary      归还车辆
// @Tags         OA-用车
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "用车申请ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/vehicle-applications/{id}/return [post]
func (h *VehicleApplicationHandler) Return(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Return(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

type SealHandler struct {
	svc *service.SealService
}

func NewSealHandler() *SealHandler { return &SealHandler{svc: service.NewSealService()} }

// List 印章列表
// @Summary      印章列表
// @Tags         OA-印章
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int     false  "页码"
// @Param        page_size  query  int     false  "每页条数"
// @Param        name       query  string  false  "印章名称(模糊)"
// @Param        type       query  string  false  "类型(OFFICIAL/CONTRACT/FINANCE/LEGAL/OTHER)"
// @Param        status     query  string  false  "状态(1启用/2停用)"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/seals [get]
func (h *SealHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize,
		c.Query("name"), c.Query("type"), c.Query("status"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 印章详情
// @Summary      印章详情
// @Tags         OA-印章
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "印章ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/seals/{id} [get]
func (h *SealHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	seal, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, seal)
}

// Create 新建印章
// @Summary      新建印章
// @Tags         OA-印章
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateSealRequest  true  "印章"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/seals [post]
func (h *SealHandler) Create(c *gin.Context) {
	var req service.CreateSealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	seal, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, seal)
}

// Update 编辑印章
// @Summary      编辑印章
// @Tags         OA-印章
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "印章ID"
// @Param        body  body  service.UpdateSealRequest  true  "印章"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/seals/{id} [put]
func (h *SealHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateSealRequest
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

// Delete 删除印章
// @Summary      删除印章
// @Tags         OA-印章
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "印章ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/seals/{id} [delete]
func (h *SealHandler) Delete(c *gin.Context) {
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

type SealApplicationHandler struct {
	svc *service.SealApplicationService
}

func NewSealApplicationHandler() *SealApplicationHandler {
	return &SealApplicationHandler{svc: service.NewSealApplicationService()}
}

// List 用印申请列表
// @Summary      用印申请列表
// @Tags         OA-印章
// @Produce      json
// @Security     BearerAuth
// @Param        page             query  int     false  "页码"
// @Param        page_size        query  int     false  "每页条数"
// @Param        application_no   query  string  false  "申请单号(模糊)"
// @Param        title            query  string  false  "标题(模糊)"
// @Param        applicant_id     query  int     false  "申请人ID"
// @Param        approval_status  query  string  false  "审批状态"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/seal-applications [get]
func (h *SealApplicationHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	applicantID, _ := strconv.ParseUint(c.Query("applicant_id"), 10, 64)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize,
		c.Query("application_no"), c.Query("title"), c.Query("approval_status"), uint(applicantID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 用印申请详情
// @Summary      用印申请详情
// @Tags         OA-印章
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "用印申请ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/seal-applications/{id} [get]
func (h *SealApplicationHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	app, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, app)
}

// Create 新建用印申请
// @Summary      新建用印申请
// @Tags         OA-印章
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateSealApplicationRequest  true  "用印申请"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/seal-applications [post]
func (h *SealApplicationHandler) Create(c *gin.Context) {
	var req service.CreateSealApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	app, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, app)
}

// Update 编辑用印申请
// @Summary      编辑用印申请
// @Tags         OA-印章
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "用印申请ID"
// @Param        body  body  service.UpdateSealApplicationRequest  true  "用印申请"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/seal-applications/{id} [put]
func (h *SealApplicationHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateSealApplicationRequest
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

// Delete 删除用印申请
// @Summary      删除用印申请
// @Tags         OA-印章
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "用印申请ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/seal-applications/{id} [delete]
func (h *SealApplicationHandler) Delete(c *gin.Context) {
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
