package service

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/pkg/storage"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// ResetService 系统重置(一键清理业务数据)。
//
// 仅清理业务数据表,保留系统配置/字典/权限/组织架构/基础档案等"骨架"数据,
// 使重置后的实例可立即重新投入使用而无需重新配置。
// 知识库(kb_*)/云盘(cloud_file)/资产(psi_asset)为长期沉淀内容,不在清理范围。
type ResetService struct{}

func NewResetService() *ResetService {
	return &ResetService{}
}

// businessTables 待清理的业务表,按依赖倒序排列(先删子表、后删父表)。
// 名称均与 model.TableName() 一致。
//
// 注意:TRUNCATE 在 MySQL 中是 DDL,隐式提交、无法事务化,因此本操作不分
// 包在事务内 —— 逐表执行,收集错误,返回第一个遇到的错误(其余错误记入 msg)。
var businessTables = []string{
	// ── CRM ──
	"follow_up_record",
	"follow_up_plan",
	"crm_contract_payment_record",
	"crm_contract_payment_plan",
	"crm_contract_item",
	"crm_contract",
	"crm_opportunity",
	"stage_record",
	"crm_lead_owner_history",
	"crm_lead",
	"crm_customer_owner_history",
	"crm_customer_collaboration",
	"crm_customer_contact",
	"crm_customer",
	"crm_contract_template",
	"customer_field",
	"customer_field_blob",
	"lead_field",
	"lead_field_blob",
	"opportunity_field",
	"opportunity_field_blob",
	"contract_field",
	"contract_field_blob",
	"follow_up_record_field",
	"follow_up_record_field_blob",
	"crm_ticket_log",
	"crm_ticket",

	// ── 项目 ──
	"proj_task",
	"proj_project",

	// ── 审批实例 ──
	"approval_instance",
	"approval_task",
	"approval_add_sign_task",
	"approval_record",
	"approval_return_back_record",

	// ── HRM ──
	"hrm_attendance_clock",
	"hrm_leave",
	"hrm_overtime",
	"hrm_attendance_summary",
	"hrm_payroll",
	"hrm_position_change",
	"hrm_employee",
	"hrm_candidate",
	"hrm_perf_item",
	"hrm_performance",

	// ── 财务 ──
	"fin_voucher",
	"fin_invoice",
	"fin_receivable",

	// ── PSI(进销存) ──
	"psi_stock_movement",
	"psi_stock",
	"psi_purchase_order_detail",
	"psi_purchase_return_detail",
	"psi_sales_order_detail",
	"psi_sales_return_detail",
	"psi_stock_in_order_detail",
	"psi_stock_out_order_detail",
	"psi_purchase_order",
	"psi_purchase_return",
	"psi_sales_order",
	"psi_sales_return",
	"psi_stock_in_order",
	"psi_stock_out_order",

	// ── CMS ──
	"cms_article",
	"cms_page",

	// ── OA ──
	"oa_expense_item",
	"oa_expense",
	"oa_business_trip",
	"oa_loan",
	"oa_schedule",
	"oa_work_log",
	"oa_form_data",
	"oa_meeting_booking",
	"oa_message",
	"oa_notice",

	// ── 附件与运行日志(业务数据清空后即为孤儿记录) ──
	"sys_attachment",
	"sys_field_change_log",
	"sys_operation_log",
	"sys_login_log",
	"sys_job_log",
}

// imgSrcPattern 提取富文本正文里的图片地址(<img src="...">)。
var imgSrcPattern = regexp.MustCompile(`(?i)<img[^>]+src=["']([^"']+)["']`)

// ResetBusinessData 清空所有业务表数据,并在清表前先删除关联的存储层文件
// (OSS 对象/本地文件),避免表清掉后文件成为无法追溯的孤儿。
//
// 流程:① 扫描附件登记与内嵌 URL 字段收集 object_key → ② 逐个删除存储文件
// → ③ 逐表 TRUNCATE TABLE(比 DELETE 高效、自动重置自增 ID)。
//
// 存储文件删除失败会让整个重置在清表前失败返回(此时表数据仍在,可修复后重试),
// 避免出现"表已清、文件删不掉"的不可恢复孤儿。
func (s *ResetService) ResetBusinessData(ctx context.Context) error {
	if err := s.deleteStorageFiles(ctx); err != nil {
		return fmt.Errorf("清理存储文件失败(业务表未动,可重试): %w", err)
	}

	var failed []string
	var firstErr error

	for _, table := range businessTables {
		if err := repository.TruncateTable(ctx, table); err != nil {
			if firstErr == nil {
				firstErr = err
			}
			failed = append(failed, table)
		}
	}

	if firstErr != nil {
		return fmt.Errorf("清理业务数据失败,共 %d 张表出错: %s; 首个错误: %w",
			len(failed), strings.Join(failed, ", "), firstErr)
	}
	return nil
}

// deleteStorageFiles 删除重置范围内业务数据关联的存储文件。
// 文件键来源:sys_attachment 附件登记(带准确 visibility) + 文章封面/正文图片、
// 候选人简历等内嵌 URL 字段(桶归属未知,公共/私有各尝试一次,删除幂等)。
func (s *ResetService) deleteStorageFiles(ctx context.Context) error {
	keys, err := s.collectFileKeys(ctx)
	if err != nil {
		return err
	}

	uploader := app.GetUploader()
	var failed []string
	for _, k := range keys {
		if err := uploader.Delete(k.ObjectKey, k.Visibility); err != nil {
			// 私有桶未配置属环境问题,记日志跳过(强行阻断会让重置永远无法执行)
			if errors.Is(err, storage.ErrPrivateBucketDisabled) {
				xlogger.InfofCtx(ctx, "重置:私有存储未配置,跳过删除 key=%s: %v", k.ObjectKey, err)
				continue
			}
			xlogger.ErrorfCtx(ctx, "重置:删除存储文件失败 key=%s visibility=%s: %v",
				k.ObjectKey, k.Visibility, err)
			failed = append(failed, k.ObjectKey)
		}
	}
	if len(failed) > 0 {
		return fmt.Errorf("%d 个文件删除失败: %s", len(failed), strings.Join(failed, ", "))
	}
	return nil
}

// collectFileKeys 汇总待删除的存储文件键(去重)。
func (s *ResetService) collectFileKeys(ctx context.Context) ([]repository.ResetFileKey, error) {
	seen := make(map[string]bool)
	keys := make([]repository.ResetFileKey, 0)
	add := func(objectKey, visibility string) {
		if objectKey == "" || seen[objectKey+"\x00"+visibility] {
			return
		}
		seen[objectKey+"\x00"+visibility] = true
		keys = append(keys, repository.ResetFileKey{ObjectKey: objectKey, Visibility: visibility})
	}

	// 1. 附件登记表:visibility 准确,按登记值删
	attachments, err := repository.ListResetAttachments(ctx)
	if err != nil {
		return nil, err
	}
	for _, att := range attachments {
		add(att.ObjectKey, att.Visibility)
	}

	// 2. 内嵌 URL 字段:文章封面、候选人简历、文章正文 <img>
	columns := []struct{ table, column string }{
		{"cms_article", "cover_url"},
		{"hrm_candidate", "resume_url"},
		{"cms_article", "content"},
	}
	for _, col := range columns {
		values, err := repository.ListResetColumnValues(ctx, col.table, col.column)
		if err != nil {
			return nil, err
		}
		for _, v := range values {
			if col.column == "content" {
				for _, src := range extractImgSrcs(v) {
					addURLKey(src, add)
				}
				continue
			}
			addURLKey(v, add)
		}
	}
	return keys, nil
}

// addURLKey 把字段里的文件 URL 转为 objectKey 并登记待删。
// 内嵌 URL 无法确知桶归属,公共/私有各登记一次(存储层删除幂等,不存在的对象为 no-op)。
func addURLKey(raw string, add func(objectKey, visibility string)) {
	key := objectKeyFromURL(raw)
	if key == "" {
		return
	}
	add(key, storage.VisibilityPublic)
	add(key, storage.VisibilityPrivate)
}

// objectKeyFromURL 从完整 URL 提取 objectKey(去协议域名与 query 参数);非 URL 原样返回。
func objectKeyFromURL(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	if !strings.Contains(s, "://") {
		return s
	}
	u, err := url.Parse(s)
	if err != nil {
		return ""
	}
	return strings.TrimPrefix(u.Path, "/")
}

// extractImgSrcs 提取 HTML 富文本中的全部图片 src。
func extractImgSrcs(html string) []string {
	matches := imgSrcPattern.FindAllStringSubmatch(html, -1)
	srcs := make([]string, 0, len(matches))
	for _, m := range matches {
		srcs = append(srcs, m[1])
	}
	return srcs
}
