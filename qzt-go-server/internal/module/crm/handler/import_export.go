package handler

// import_export.go CRM 导入导出 handler。

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

type ImportExportHandler struct {
	svc *service.ImportExportService
}

func NewImportExportHandler() *ImportExportHandler {
	return &ImportExportHandler{svc: service.NewImportExportService()}
}

// DownloadTemplate 下载导入模板。
func (h *ImportExportHandler) DownloadTemplate(c *gin.Context) {
	bizType := c.Query("biz_type")
	if bizType == "" {
		bizType = "customer"
	}
	buf, err := h.svc.GenerateTemplate(c.Request.Context(), bizType)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	fileName := map[string]string{"customer": "客户导入模板"}[bizType]
	if fileName == "" {
		fileName = "导入模板"
	}
	c.Header("Content-Disposition", "attachment; filename="+fileName+".xlsx")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

// Import 导入 Excel 数据。
func (h *ImportExportHandler) Import(c *gin.Context) {
	bizType := c.DefaultQuery("biz_type", "customer")
	file, err := c.FormFile("file")
	if err != nil {
		response.Fail(c, errcode.ErrParam, "请上传文件")
		return
	}
	src, err := file.Open()
	if err != nil {
		response.Fail(c, errcode.ErrServer, "打开文件失败")
		return
	}
	defer src.Close()

	data := make([]byte, file.Size)
	src.Read(data)

	operatorID := middleware.GetUserID(c)
	result, err := h.svc.Import(c.Request.Context(), bizType, data, operatorID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}

// 防止 unused
var _ = strconv.Atoi
