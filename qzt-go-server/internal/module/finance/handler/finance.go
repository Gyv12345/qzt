package handler

import (
	"encoding/base64"
	"io"
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/finance/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// FinanceHandler 财务管理。
type FinanceHandler struct {
	svc *service.FinanceService
}

func NewFinanceHandler() *FinanceHandler {
	return &FinanceHandler{svc: service.NewFinanceService()}
}

// ── 科目 ──

// AccountList 科目列表
// @Summary      会计科目列表
// @Tags         财务-科目
// @Produce      json
// @Security     BearerAuth
// @Param        type  query  string  false  "类型(ASSET/LIABILITY/EQUITY/INCOME/EXPENSE)"
// @Success      200  {object}  xresponse.Response
// @Router       /finance/accounts [get]
func (h *FinanceHandler) AccountList(c *gin.Context) {
	list, err := h.svc.AccountList(c.Request.Context(), c.Query("type"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// CreateAccount 创建科目
// @Summary      创建会计科目
// @Tags         财务-科目
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateAccountRequest  true  "科目"
// @Success      200   {object}  xresponse.Response
// @Router       /finance/accounts [post]
func (h *FinanceHandler) CreateAccount(c *gin.Context) {
	var req service.CreateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	acc, err := h.svc.CreateAccount(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, acc)
}

// ── 凭证 ──

// CreateVoucher 创建凭证
// @Summary      创建记账凭证
// @Tags         财务-凭证
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateVoucherRequest  true  "凭证"
// @Success      200   {object}  xresponse.Response
// @Router       /finance/vouchers [post]
func (h *FinanceHandler) CreateVoucher(c *gin.Context) {
	var req service.CreateVoucherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	v, err := h.svc.CreateVoucher(c.Request.Context(), &req, userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, v)
}

// VoucherList 凭证列表
// @Summary      凭证列表
// @Tags         财务-凭证
// @Produce      json
// @Security     BearerAuth
// @Param        page        query  int     false  "页码"
// @Param        page_size   query  int     false  "每页条数"
// @Param        start_date  query  string  false  "开始日期"
// @Param        end_date    query  string  false  "结束日期"
// @Param        account_id  query  int     false  "科目ID"
// @Param        status      query  string  false  "状态"
// @Success      200  {object}  xresponse.Response
// @Router       /finance/vouchers [get]
func (h *FinanceHandler) VoucherList(c *gin.Context) {
	p := syservice.GetPagination(c)
	accID, _ := strconv.ParseUint(c.Query("account_id"), 10, 64)
	list, total, err := h.svc.VoucherList(c.Request.Context(), p.Page, p.PageSize,
		c.Query("start_date"), c.Query("end_date"), uint(accID), c.Query("status"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// ConfirmVoucher 确认凭证
// @Summary      确认凭证
// @Tags         财务-凭证
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "凭证ID"
// @Success      200  {object}  xresponse.Response
// @Router       /finance/vouchers/{id}/confirm [put]
func (h *FinanceHandler) ConfirmVoucher(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.svc.ConfirmVoucher(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ── 发票 ──

// CreateInvoice 创建发票
// @Summary      创建发票
// @Tags         财务-发票
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateInvoiceRequest  true  "发票"
// @Success      200   {object}  xresponse.Response
// @Router       /finance/invoices [post]
func (h *FinanceHandler) CreateInvoice(c *gin.Context) {
	var req service.CreateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	inv, err := h.svc.CreateInvoice(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, inv)
}

// InvoiceList 发票列表
// @Summary      发票列表
// @Tags         财务-发票
// @Produce      json
// @Security     BearerAuth
// @Param        page        query  int     false  "页码"
// @Param        page_size   query  int     false  "每页条数"
// @Param        direction   query  string  false  "方向(RECEIVED/ISSUED)"
// @Param        start_date  query  string  false  "开始日期"
// @Param        end_date    query  string  false  "结束日期"
// @Success      200  {object}  xresponse.Response
// @Router       /finance/invoices [get]
func (h *FinanceHandler) InvoiceList(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.InvoiceList(c.Request.Context(), p.Page, p.PageSize,
		c.Query("direction"), c.Query("start_date"), c.Query("end_date"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// InvoiceOCR 发票图片识别(OCR)
// @Summary      发票图片识别(OCR)
// @Description  上传发票图片(jpg/png/webp,≤10MB),千问 qwen-vl 视觉识别出票面结构化字段。
//               识别结果不落库,仅供前端回填发票表单人工确认后走既有保存接口;
//               每用户每日限 50 次,超限报错。
// @Tags         财务-发票
// @Accept       multipart/form-data
// @Produce      json
// @Security     BearerAuth
// @Param        image  formData  file  true  "发票图片(jpg/png/webp,≤10MB)"
// @Success      200  {object}  xresponse.Response
// @Router       /finance/invoices/ocr [post]
func (h *FinanceHandler) InvoiceOCR(c *gin.Context) {
	fileHeader, err := c.FormFile("image")
	if err != nil {
		response.Fail(c, errcode.ErrParam, "缺少 image 文件字段")
		return
	}
	mimeType, err := service.ValidateOCRUpload(fileHeader.Size, fileHeader.Header.Get("Content-Type"))
	if err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	f, err := fileHeader.Open()
	if err != nil {
		response.Fail(c, errcode.ErrServer, "读取上传文件失败")
		return
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, service.OCRMaxFileSize+1))
	if err != nil || len(data) == 0 {
		response.Fail(c, errcode.ErrServer, "读取上传文件失败")
		return
	}
	result, err := h.svc.RecognizeInvoice(c.Request.Context(), middleware.GetUserID(c),
		mimeType, base64.StdEncoding.EncodeToString(data))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}

// ── 报表 ──

// IncomeStatement 利润表
// @Summary      利润表
// @Tags         财务-报表
// @Produce      json
// @Security     BearerAuth
// @Param        start_date  query  string  true  "开始日期"
// @Param        end_date    query  string  true  "结束日期"
// @Success      200  {object}  xresponse.Response
// @Router       /finance/reports/income-statement [get]
func (h *FinanceHandler) IncomeStatement(c *gin.Context) {
	data, err := h.svc.IncomeStatement(c.Request.Context(), c.Query("start_date"), c.Query("end_date"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}

// BalanceSheet 资产负债表
// @Summary      资产负债表
// @Tags         财务-报表
// @Produce      json
// @Security     BearerAuth
// @Param        end_date  query  string  true  "截止日期"
// @Success      200  {object}  xresponse.Response
// @Router       /finance/reports/balance-sheet [get]
func (h *FinanceHandler) BalanceSheet(c *gin.Context) {
	data, err := h.svc.BalanceSheet(c.Request.Context(), c.Query("end_date"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}
