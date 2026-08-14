package service

import (
	"context"
	"fmt"
	"strings"

	"qzt-go-server/internal/repository"
)

// ResetService 系统重置(一键清理业务数据)。
//
// 仅清理业务数据表,保留系统配置/字典/权限/组织架构/基础档案等"骨架"数据,
// 使重置后的实例可立即重新投入使用而无需重新配置。
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
	"opportunity_field",
	"opportunity_field_blob",
	"contract_field",
	"contract_field_blob",
	"follow_up_record_field",
	"follow_up_record_field_blob",

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

	// ── 财务 ──
	"fin_voucher",
	"fin_invoice",

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

	// ── 企业消息/公告 ──
	"oa_message",
	"oa_notice",
}

// ResetBusinessData 硬清空所有业务表数据。
//
// 使用 TRUNCATE TABLE(MySQL DDL):比 DELETE 高效、自动重置自增 ID。
// TRUNCATE 无法事务化,故逐表执行并收集错误。返回的 error 为第一个失败表
// 的错误,失败表名拼接在错误信息中便于排查。
func (s *ResetService) ResetBusinessData(ctx context.Context) error {
	db := repository.DBFrom(ctx)
	var failed []string
	var firstErr error

	for _, table := range businessTables {
		if err := db.Exec(fmt.Sprintf("TRUNCATE TABLE `%s`", table)).Error; err != nil {
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
