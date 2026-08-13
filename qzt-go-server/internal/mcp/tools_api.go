package mcp

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"mime"
	"path/filepath"
	"strings"
	"time"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"qzt-go-server/config"
	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	apisvc "qzt-go-server/internal/module/api/service"
)

// tools_api.go 公共基础设施工具(BI 报表 / 统一日历 / 附件 / 文件)。
// 数据来源全部走 api/service(DashboardService / CalendarService / AttachmentService),
// 文件签发与直传预签名复用 app.Uploader 与 config(与 api/handler/upload.go 同源)。

// mcpSignTTL 私有文件签名下载 URL 有效期(与 handler 默认一致)。
const mcpSignTTL = time.Hour

// registerApiTools 注册公共基础设施工具(BI 报表 / 统一日历 / 附件 / 文件)。
func registerApiTools(s *server.MCPServer) {
	registerDashboardExtraTools(s)
	registerCalendarTools(s)
	registerAttachmentTools(s)
	registerFileTools(s)
}

// ── BI 报表(dashboard_ 前缀,扩展接口) ──

func registerDashboardExtraTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("dashboard_customer_distribution",
			mcp.WithDescription("查询客户分布(BI),按维度分组统计客户"),
			mcp.WithString("dimension", mcp.Description("维度:level/source/industry/status,默认level")),
		),
		handleDashboardCustomerDistribution,
	)

	s.AddTool(
		mcp.NewTool("dashboard_finance_summary",
			mcp.WithDescription("查询财务概览(采购额/销售额/回款额/库存总值)"),
			mcp.WithString("start_date", mcp.Description("开始日期(yyyy-MM-dd)")),
			mcp.WithString("end_date", mcp.Description("结束日期(yyyy-MM-dd)")),
		),
		handleDashboardFinanceSummary,
	)

	s.AddTool(
		mcp.NewTool("dashboard_contract_trend",
			mcp.WithDescription("查询合同签约趋势(近N月金额与数量)"),
			mcp.WithNumber("months", mcp.Description("月数(默认6)")),
		),
		handleDashboardContractTrend,
	)

	s.AddTool(
		mcp.NewTool("dashboard_sales_ranking",
			mcp.WithDescription("查询销售业绩排行(按合同负责人汇总金额)"),
			mcp.WithNumber("limit", mcp.Description("返回条数(默认10,最大50)")),
		),
		handleDashboardSalesRanking,
	)

	s.AddTool(
		mcp.NewTool("dashboard_lead_source_distribution",
			mcp.WithDescription("查询线索来源分布"),
		),
		handleDashboardLeadSourceDistribution,
	)

	s.AddTool(
		mcp.NewTool("dashboard_employee_distribution",
			mcp.WithDescription("查询员工分布(按部门/性别/状态)"),
			mcp.WithString("dimension", mcp.Description("维度:department/gender/status,默认department")),
		),
		handleDashboardEmployeeDistribution,
	)

	s.AddTool(
		mcp.NewTool("dashboard_headcount_trend",
			mcp.WithDescription("查询近N月入职人数趋势"),
			mcp.WithNumber("months", mcp.Description("月数(默认6)")),
		),
		handleDashboardHeadcountTrend,
	)

	s.AddTool(
		mcp.NewTool("dashboard_attendance_summary",
			mcp.WithDescription("查询月度考勤汇总(按部门:请假天数/加班小时)"),
			mcp.WithString("month", mcp.Description("月份(yyyy-MM,默认当前月)")),
		),
		handleDashboardAttendanceSummary,
	)

	s.AddTool(
		mcp.NewTool("dashboard_finance_trend",
			mcp.WithDescription("查询近N月收支趋势(凭证按月聚合)"),
			mcp.WithNumber("months", mcp.Description("月数(默认6)")),
		),
		handleDashboardFinanceTrend,
	)

	s.AddTool(
		mcp.NewTool("dashboard_stock_value_by_warehouse",
			mcp.WithDescription("查询各仓库库存总值(数量×成本价)"),
		),
		handleDashboardStockValueByWarehouse,
	)

	s.AddTool(
		mcp.NewTool("dashboard_sales_vs_purchase",
			mcp.WithDescription("查询近N月采购额 vs 销售额对比"),
			mcp.WithNumber("months", mcp.Description("月数(默认6)")),
		),
		handleDashboardSalesVsPurchase,
	)
}

func handleDashboardCustomerDistribution(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	dimension := req.GetString("dimension", "level")
	data, err := svc.CustomerDistribution(ctx, dimension)
	if err != nil {
		return resultError(fmt.Sprintf("查询客户分布失败: %v", err))
	}
	return resultText(data)
}

func handleDashboardFinanceSummary(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	start := req.GetString("start_date", "")
	end := req.GetString("end_date", "")
	data, err := svc.FinanceSummary(ctx, start, end)
	if err != nil {
		return resultError(fmt.Sprintf("查询财务概览失败: %v", err))
	}
	return resultText(data)
}

func handleDashboardContractTrend(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	months := int(req.GetFloat("months", 6))
	data, err := svc.ContractTrend(ctx, months)
	if err != nil {
		return resultError(fmt.Sprintf("查询合同签约趋势失败: %v", err))
	}
	return resultText(data)
}

func handleDashboardSalesRanking(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	limit := int(req.GetFloat("limit", 10))
	data, err := svc.SalesRanking(ctx, limit)
	if err != nil {
		return resultError(fmt.Sprintf("查询销售业绩排行失败: %v", err))
	}
	return resultText(data)
}

func handleDashboardLeadSourceDistribution(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	data, err := svc.LeadSourceDistribution(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("查询线索来源分布失败: %v", err))
	}
	return resultText(data)
}

func handleDashboardEmployeeDistribution(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	dim := req.GetString("dimension", "department")
	data, err := svc.EmployeeDistribution(ctx, dim)
	if err != nil {
		return resultError(fmt.Sprintf("查询员工分布失败: %v", err))
	}
	return resultText(data)
}

func handleDashboardHeadcountTrend(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	months := int(req.GetFloat("months", 6))
	data, err := svc.HeadcountTrend(ctx, months)
	if err != nil {
		return resultError(fmt.Sprintf("查询入职趋势失败: %v", err))
	}
	return resultText(data)
}

func handleDashboardAttendanceSummary(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	month := req.GetString("month", "")
	data, err := svc.AttendanceSummary(ctx, month)
	if err != nil {
		return resultError(fmt.Sprintf("查询考勤汇总失败: %v", err))
	}
	return resultText(data)
}

func handleDashboardFinanceTrend(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	months := int(req.GetFloat("months", 6))
	data, err := svc.FinanceTrend(ctx, months)
	if err != nil {
		return resultError(fmt.Sprintf("查询收支趋势失败: %v", err))
	}
	return resultText(data)
}

func handleDashboardStockValueByWarehouse(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	data, err := svc.StockValueByWarehouse(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("查询仓库库存总值失败: %v", err))
	}
	return resultText(data)
}

func handleDashboardSalesVsPurchase(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	months := int(req.GetFloat("months", 6))
	data, err := svc.SalesVsPurchase(ctx, months)
	if err != nil {
		return resultError(fmt.Sprintf("查询采购vs销售对比失败: %v", err))
	}
	return resultText(data)
}

// ── 统一日历 ──

func registerCalendarTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("calendar",
			mcp.WithDescription("查询统一日历(聚合各业务模块带日期的待办,仅返回当前用户的)"),
			mcp.WithString("start_date", mcp.Required(), mcp.Description("开始日期(YYYY-MM-DD,必填)")),
			mcp.WithString("end_date", mcp.Required(), mcp.Description("结束日期(YYYY-MM-DD,必填)")),
			mcp.WithString("sources", mcp.Description("来源(逗号分隔),省略=全部。可选:schedule,followup,opportunity,payment,meeting,trip,leave,worklog,project,task,receivable,performance")),
		),
		handleCalendar,
	)
}

func handleCalendar(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewCalendarService()
	userID := userIDFromContext(ctx)
	startDate := req.GetString("start_date", "")
	endDate := req.GetString("end_date", "")
	if startDate == "" || endDate == "" {
		return resultError("start_date 和 end_date 必填")
	}

	var sources []string
	if s := req.GetString("sources", ""); s != "" {
		for _, v := range strings.Split(s, ",") {
			if v = strings.TrimSpace(v); v != "" {
				sources = append(sources, v)
			}
		}
	}

	events, err := svc.List(ctx, userID, startDate, endDate, sources)
	if err != nil {
		return resultError(fmt.Sprintf("查询日历失败: %v", err))
	}
	return resultText(map[string]any{"list": events})
}

// ── 附件 ──

func registerAttachmentTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("attachment_list",
			mcp.WithDescription("查询附件列表(按 biz_type + resource_id)"),
			mcp.WithString("biz_type", mcp.Required(), mcp.Description("业务类型,如 CUSTOMER/CONTRACT")),
			mcp.WithNumber("resource_id", mcp.Required(), mcp.Description("资源ID")),
		),
		handleAttachmentList,
	)

	s.AddTool(
		mcp.NewTool("attachment_create",
			mcp.WithDescription("创建附件记录(前端先上传文件,再调本接口落库关联)"),
			mcp.WithString("biz_type", mcp.Required(), mcp.Description("业务类型,如 CUSTOMER/CONTRACT")),
			mcp.WithNumber("resource_id", mcp.Required(), mcp.Description("资源ID")),
			mcp.WithString("file_name", mcp.Required(), mcp.Description("文件名")),
			mcp.WithString("url", mcp.Required(), mcp.Description("访问 URL(上传后返回的 file_url)")),
			mcp.WithString("object_key", mcp.Description("文件 objectKey(私有桶场景)")),
			mcp.WithNumber("size", mcp.Description("文件大小(字节)")),
			mcp.WithString("content_type", mcp.Description("文件 MIME")),
			mcp.WithString("visibility", mcp.Description("可见性:public/private(默认private)")),
		),
		handleAttachmentCreate,
	)

	s.AddTool(
		mcp.NewTool("attachment_delete",
			mcp.WithDescription("删除附件记录(仅上传人或超级管理员可删,不删存储层实际文件)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("附件ID")),
		),
		handleAttachmentDelete,
	)
}

func handleAttachmentList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewAttachmentService()
	bizType := strings.TrimSpace(req.GetString("biz_type", ""))
	resourceID := uint(req.GetFloat("resource_id", 0))
	if bizType == "" || resourceID == 0 {
		return resultError("biz_type 和 resource_id 必填")
	}
	list, err := svc.List(ctx, bizType, resourceID)
	if err != nil {
		return resultError(fmt.Sprintf("查询附件列表失败: %v", err))
	}
	return resultText(list)
}

func handleAttachmentCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewAttachmentService()
	bizType := req.GetString("biz_type", "")
	resourceID := uint(req.GetFloat("resource_id", 0))
	fileName := req.GetString("file_name", "")
	url := req.GetString("url", "")
	if bizType == "" || resourceID == 0 || fileName == "" || url == "" {
		return resultError("biz_type、resource_id、file_name、url 必填")
	}
	createReq := &apisvc.CreateAttachmentRequest{
		BizType:     bizType,
		ResourceID:  resourceID,
		FileName:    fileName,
		ObjectKey:   req.GetString("object_key", ""),
		URL:         url,
		Size:        int64(req.GetFloat("size", 0)),
		ContentType: req.GetString("content_type", ""),
		Visibility:  req.GetString("visibility", ""),
	}
	att, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建附件失败: %v", err))
	}
	return resultText(att)
}

func handleAttachmentDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewAttachmentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("附件ID(id)必填")
	}
	if err := svc.Delete(ctx, id, userIDFromContext(ctx), isSuperAdminFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("删除附件失败: %v", err))
	}
	return resultText(map[string]any{"message": "附件已删除", "id": id})
}

// ── 文件 ──

func registerFileTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("file_sign",
			mcp.WithDescription("为私有文件签发短期(1小时)下载 URL,无需 Authorization header"),
			mcp.WithString("key", mcp.Required(), mcp.Description("文件 objectKey(上传时返回的 file_url)")),
		),
		handleFileSign,
	)

	s.AddTool(
		mcp.NewTool("file_upload_sts",
			mcp.WithDescription("获取 OSS 直传预签名 URL(前端直接 PUT 文件到 OSS)"),
			mcp.WithString("filename", mcp.Required(), mcp.Description("文件名(用于推断扩展名与 MIME)")),
			mcp.WithString("folder", mcp.Description("存储文件夹(默认 uploads)")),
			mcp.WithBoolean("private", mcp.Description("是否上传到私有桶(默认 false)")),
		),
		handleFileUploadSTS,
	)
}

func handleFileSign(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	key := req.GetString("key", "")
	if key == "" {
		return resultError("key 必填")
	}
	uploader := app.GetUploader()
	if uploader == nil {
		return resultError("文件存储服务未初始化")
	}
	signedURL, err := uploader.SignURL(key, mcpSignTTL)
	if err != nil {
		return resultError(fmt.Sprintf("生成下载链接失败: %v", err))
	}
	return resultText(map[string]any{"url": signedURL})
}

// handleFileUploadSTS 复刻 api/handler/upload.go 的 STS 逻辑(OSS 直传预签名)。
func handleFileUploadSTS(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	storageCfg := config.Get().Storage
	if storageCfg.Driver != config.StorageDriverOSS {
		// local 模式:前端走后端上传,返回 driver=local
		return resultText(map[string]any{
			"driver": "local",
		})
	}

	filename := req.GetString("filename", "")
	if filename == "" {
		return resultError("filename 必填")
	}
	folder := req.GetString("folder", "uploads")
	if folder == "" {
		folder = "uploads"
	}
	usePrivate := req.GetBool("private", false)

	// 推断扩展名与 content-type
	ext := strings.ToLower(filepath.Ext(filename))
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// 生成随机 objectKey: folder/YYYYMMDD/<rand><ext>
	now := time.Now()
	objectKey := strings.Trim(folder, "/") + "/" + now.Format("20060102") + "/" + randomHexToken(16) + ext

	// 用 OSS SDK 签 PUT URL(15 分钟有效)
	client, err := oss.New(storageCfg.OSS.Endpoint, storageCfg.OSS.AccessKeyID, storageCfg.OSS.AccessKeySecret)
	if err != nil {
		return resultError(fmt.Sprintf("创建 OSS 客户端失败: %v", err))
	}

	bucketName := storageCfg.OSS.BucketName
	if usePrivate {
		bucketName = storageCfg.OSS.PrivateBucketName
	}
	if bucketName == "" {
		return resultError("私有桶未配置,请在配置文件设置 oss.private_bucket_name")
	}

	bucket, err := client.Bucket(bucketName)
	if err != nil {
		return resultError(fmt.Sprintf("获取 bucket 失败: %v", err))
	}

	// 公共桶 inline 预览;私有桶 attachment 触发下载
	disposition := "inline"
	if usePrivate {
		disposition = "attachment"
	}
	uploadURL, err := bucket.SignURL(objectKey, oss.HTTPPut, 900,
		oss.ContentType(contentType),
		oss.ContentDisposition(disposition),
	)
	if err != nil {
		return resultError(fmt.Sprintf("签名失败: %v", err))
	}

	// 拼最终访问 URL:公共桶用 CDN 明文,私有桶返回 objectKey
	var fileURL string
	if usePrivate {
		fileURL = objectKey
	} else {
		cdnDomain := storageCfg.OSS.CustomDomain
		if cdnDomain == "" {
			cdnDomain = storageCfg.ResourceDomain
		}
		cdnDomain = strings.TrimRight(cdnDomain, "/")
		fileURL = cdnDomain + "/" + objectKey
	}

	return resultText(map[string]any{
		"driver":       "oss",
		"upload_url":   uploadURL,
		"file_url":     fileURL,
		"content_type": contentType,
	})
}

// ── 辅助函数 ──

// isSuperAdminFromContext 从 MCP context 取角色编码,判断是否超管。
// 与 userIDFromContext 同源(mcpAuthMiddleware 写入的 context key)。
func isSuperAdminFromContext(ctx context.Context) bool {
	if v := ctx.Value("role_codes"); v != nil {
		if codes, ok := v.([]string); ok {
			for _, c := range codes {
				if c == model.SuperAdminRoleCode {
					return true
				}
			}
		}
	}
	return false
}

// randomHexToken 生成 n 字节的随机十六进制字符串(用于 OSS objectKey)。
func randomHexToken(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}
