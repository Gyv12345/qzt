package service

// import_export.go CRM 导入导出服务。
// 模板下载:固定列 + 自定义字段列。
// 导入:解析 Excel → 批量创建 → 返回成功/失败明细。

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/pkg/xlogger"
)

// ImportExportService 导入导出服务。
type ImportExportService struct {
	customerSvc   *CustomerService
	fieldSvc      *CustomFieldService
}

func NewImportExportService() *ImportExportService {
	return &ImportExportService{
		customerSvc: NewCustomerService(),
		fieldSvc:    NewCustomFieldService(),
	}
}

// ── 固定列定义 ──

type importColumn struct {
	Name     string // Excel 列名
	Field    string // struct 字段名
	Required bool
}

var customerColumns = []importColumn{
	{Name: "客户名称", Field: "name", Required: true},
	{Name: "级别", Field: "level"},
	{Name: "来源", Field: "source"},
	{Name: "行业", Field: "industry"},
}

// GenerateTemplate 生成导入模板(固定列 + 自定义字段列)。
func (s *ImportExportService) GenerateTemplate(ctx context.Context, bizType string) (*bytes.Buffer, error) {
	f := excelize.NewFile()
	sheet := "Sheet1"
	f.SetSheetName(f.GetSheetName(0), sheet)

	// 根据业务类型选固定列
	var cols []importColumn
	switch bizType {
	case "customer":
		cols = customerColumns
	default:
		return nil, fmt.Errorf("不支持的业务类型: %s", bizType)
	}

	// 写固定列表头
	for i, c := range cols {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		header := c.Name
		if c.Required {
			header += "*"
		}
		f.SetCellValue(sheet, cell, header)
	}

	// 查自定义字段并追加列
	customFields := s.getCustomFields(ctx, bizType)
	for i, cf := range customFields {
		cell, _ := excelize.CoordinatesToCellName(len(cols)+i+1, 1)
		f.SetCellValue(sheet, cell, cf.Name)
	}

	// 写示例行(第2行)
	for i, c := range cols {
		cell, _ := excelize.CoordinatesToCellName(i+1, 2)
		example := ""
		switch c.Field {
		case "name":
			example = "示例客户公司"
		case "level":
			example = "A"
		case "source":
			example = "网络推广"
		case "industry":
			example = "互联网"
		case "phone":
			example = "13800138000"
		}
		f.SetCellValue(sheet, cell, example)
	}

	// 设置表头样式(加粗)
	style, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#E8F0FF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center"},
	})
	for i := range cols {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellStyle(sheet, cell, cell, style)
	}

	// 设置列宽
	for i, c := range cols {
		colName, _ := excelize.ColumnNumberToName(i + 1)
		width := 15.0
		if c.Field == "name" || c.Field == "description" || c.Field == "address" {
			width = 25.0
		}
		f.SetColWidth(sheet, colName, "", width)
	}

	buf, err := f.WriteToBuffer()
	return buf, err
}

// ImportResult 导入结果。
type ImportResult struct {
	Total   int            `json:"total"`
	Success int            `json:"success"`
	Failed  int            `json:"failed"`
	Errors  []ImportError  `json:"errors"`
}

type ImportError struct {
	Row     int    `json:"row"`
	Name    string `json:"name"`
	Message string `json:"message"`
}

// Import 导入 Excel 数据。
func (s *ImportExportService) Import(ctx context.Context, bizType string, data []byte, operatorID uint) (*ImportResult, error) {
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("打开Excel文件失败: %w", err)
	}
	defer f.Close()

	sheet := f.GetSheetName(0)
	rows, err := f.GetRows(sheet)
	if err != nil {
		return nil, fmt.Errorf("读取Excel失败: %w", err)
	}
	if len(rows) < 2 {
		return nil, fmt.Errorf("Excel没有数据行(至少需要表头+1行数据)")
	}

	// 解析表头,匹配固定列 + 自定义字段
	header := rows[0]
	colMap := s.parseHeader(header, bizType)

	// 查自定义字段(用于写入值)
	customFields := s.getCustomFields(ctx, bizType)
	customFieldMap := make(map[string]crmmodel.SysModuleField)
	for _, cf := range customFields {
		customFieldMap[cf.Name] = cf
	}

	result := &ImportResult{Total: 0, Errors: []ImportError{}}

	for rowIdx := 1; rowIdx < len(rows); rowIdx++ {
		row := rows[rowIdx]
		result.Total++

		// 跳过空行
		if len(row) == 0 || (len(row) == 1 && strings.TrimSpace(row[0]) == "") {
			continue
		}

		// 解析行数据
		rowData := make(map[string]string)
		for colName, colIdx := range colMap {
			if colIdx < len(row) {
				rowData[colName] = strings.TrimSpace(row[colIdx])
			}
		}

		// 校验必填
		var missingFields []string
		for _, c := range customerColumns {
			if c.Required && rowData[c.Field] == "" {
				missingFields = append(missingFields, c.Name)
			}
		}
		if len(missingFields) > 0 {
			result.Failed++
			result.Errors = append(result.Errors, ImportError{
				Row:     rowIdx + 1,
				Name:    rowData["name"],
				Message: fmt.Sprintf("必填项为空: %s", strings.Join(missingFields, ", ")),
			})
			continue
		}

		// 提取自定义字段值
		customValues := make(map[string]string)
		for colName, val := range rowData {
			if _, isFixed := isFixedField(colName, bizType); !isFixed {
				if cf, ok := customFieldMap[colName]; ok {
					customValues[cf.ID] = val
				}
			}
		}

		// 创建客户
		err := s.createCustomerFromImport(ctx, rowData, customValues, operatorID, rowIdx, result)
		if err != nil {
			xlogger.ErrorfCtx(ctx, "导入客户失败 row=%d: %v", rowIdx+1, err)
		}
	}

	result.Success = result.Total - result.Failed
	return result, nil
}

// createCustomerFromImport 从导入数据创建客户。
func (s *ImportExportService) createCustomerFromImport(ctx context.Context, rowData map[string]string, customValues map[string]string, operatorID uint, rowIdx int, result *ImportResult) error {
	// 构造创建请求
	req := &CreateCustomerRequest{
		Name:     rowData["name"],
		Level:    rowData["level"],
		Source:   rowData["source"],
		Industry: rowData["industry"],
		OwnerID:  &operatorID,
	}

	customer, err := s.customerSvc.Create(ctx, req, operatorID)
	if err != nil {
		result.Failed++
		result.Errors = append(result.Errors, ImportError{
			Row:     rowIdx + 1,
			Name:    rowData["name"],
			Message: err.Error(),
		})
		return err
	}

	// 写入自定义字段值
	if len(customValues) > 0 && customer != nil {
		values := make([]crmmodel.SysModuleField, 0, len(customValues))
		_ = values // customValues 的 key 是 field_id
		for fieldID, val := range customValues {
			// 直接写 customer_field 表
			cf := &crmmodel.CustomerField{
				ID:         fmt.Sprintf("imp_%d_%s", customer.ID, fieldID),
				ResourceID: fmt.Sprintf("%d", customer.ID),
				FieldID:    fieldID,
				FieldValue: val,
			}
			repository.DBFrom(ctx).Create(cf)
		}
	}

	result.Success++
	return nil
}

// parseHeader 解析表头,返回 列名 → 列索引。
func (s *ImportExportService) parseHeader(header []string, bizType string) map[string]int {
	colMap := make(map[string]int)
	for i, h := range header {
		h = strings.TrimSpace(h)
		// 去掉必填标记 *
		h = strings.TrimSuffix(h, "*")
		colMap[h] = i
	}
	return colMap
}

// isFixedField 判断列名是否是固定字段。
func isFixedField(colName, bizType string) (string, bool) {
	for _, c := range customerColumns {
		if c.Name == colName {
			return c.Field, true
		}
	}
	return "", false
}

// getCustomFields 查指定业务类型的自定义字段定义。
func (s *ImportExportService) getCustomFields(ctx context.Context, bizType string) []crmmodel.SysModuleField {
	var formKey string
	switch bizType {
	case "customer":
		formKey = "CUSTOMER"
	default:
		return nil
	}

	// 查 form
	var form crmmodel.SysModuleForm
	if err := repository.DBFrom(ctx).Where("form_key = ?", formKey).First(&form).Error; err != nil {
		return nil
	}

	// 查字段
	var fields []crmmodel.SysModuleField
	repository.DBFrom(ctx).Where("form_id = ? AND readable = 1", form.ID).Order("pos ASC").Find(&fields)
	return fields
}

// 防止 unused import
var _ = gorm.ErrDuplicatedKey
var _ = middleware.GetUserID
