package service

import (
	"context"
	"fmt"
	"html"
	"strings"

	"qzt-go-server/config"
	crmmodel "qzt-go-server/internal/model/crm"
	sfmodel "qzt-go-server/internal/model/storefront"
	"qzt-go-server/internal/pkg/emailer"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// email.go 独立站邮件通知(P28-C 订单已支付/新询盘)。
// 收件人来自 sys_config storefront.notify_email(逗号/分号分隔);
// SMTP 凭据只走 gitignored .env(EMAIL_SMTP_*),通道或收件人任一未配置
// 一律静默跳过(站内信/企微是主通道,邮件只是补充渠道)。
// 发送失败仅记日志(前缀「独立站邮件通知」),不 panic、不影响主流程。

// notifyEmails 读通知收件人(sys_config storefront.notify_email,
// 逗号/分号分隔拆分,TrimSpace 过滤空串);无值返回 nil。
func notifyEmails(ctx context.Context) []string {
	row, err := repository.NewConfigRepo().GetByKey(ctx, keyNotifyEmail)
	if err != nil || row == nil || row.Value == "" {
		return nil
	}
	parts := strings.FieldsFunc(row.Value, func(r rune) bool { return r == ',' || r == ';' })
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// emailConfig config.Get().Email → emailer.Config 映射(凭据走 .env 注入)。
func emailConfig() *emailer.Config {
	ec := config.Get().Email
	return &emailer.Config{
		Host:     ec.Host,
		Port:     ec.Port,
		Username: ec.Username,
		Password: ec.Password,
		From:     ec.From,
	}
}

// emailAdminsOrderPaid 订单已支付邮件:订单号/币种金额/买家/商品明细表。
// PSI 单号在邮件发出时尚未生成,邮件不含。通道/收件人未配置静默跳过。
func (s *CheckoutService) emailAdminsOrderPaid(ctx context.Context, order *sfmodel.StorefrontOrder) {
	to := notifyEmails(ctx)
	cfg := emailConfig()
	if len(to) == 0 || !cfg.Enabled() {
		return
	}
	items, err := s.itemRepo.ListByOrder(ctx, order.ID)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "独立站邮件通知:订单明细查询失败 order=%s: %v", order.OrderNo, err)
		items = nil
	}
	subject := fmt.Sprintf("🌍 行简独立站订单已支付 %s", order.OrderNo)
	if err := emailer.Send(ctx, cfg, to, subject, orderPaidEmailHTML(order, items)); err != nil {
		xlogger.ErrorfCtx(ctx, "独立站邮件通知:订单邮件发送失败 order=%s: %v", order.OrderNo, err)
	}
}

// emailAdminsNewInquiry 新询盘邮件:姓名/邮箱/公司/国家/商品 slug/正文。
// 通道/收件人未配置静默跳过;失败仅记日志。
func emailAdminsNewInquiry(ctx context.Context, lead *crmmodel.CrmLead, slug string) {
	to := notifyEmails(ctx)
	cfg := emailConfig()
	if len(to) == 0 || !cfg.Enabled() {
		return
	}
	subject := "🌍 行简独立站新询盘"
	if err := emailer.Send(ctx, cfg, to, subject, inquiryEmailHTML(lead, slug)); err != nil {
		xlogger.ErrorfCtx(ctx, "独立站邮件通知:询盘邮件发送失败 lead=%s: %v", lead.LeadNo, err)
	}
}

// emailRow 邮件正文键值行。
func emailRow(label, value string) string {
	if value == "" {
		value = "-"
	}
	return fmt.Sprintf("<tr><td style=\"padding:4px 12px;color:#888;white-space:nowrap\">%s</td><td style=\"padding:4px 12px\">%s</td></tr>",
		html.EscapeString(label), html.EscapeString(value))
}

// orderPaidEmailHTML 订单已支付邮件 HTML(明细表 + 买家信息;内容全部 html 转义)。
func orderPaidEmailHTML(order *sfmodel.StorefrontOrder, items []sfmodel.StorefrontOrderItem) string {
	var b strings.Builder
	b.WriteString("<div style=\"font-family:-apple-system,'Segoe UI',Arial,sans-serif;max-width:640px\">")
	b.WriteString("<h2 style=\"margin:0 0 12px\">🌍 独立站订单已支付</h2>")
	b.WriteString("<table style=\"border-collapse:collapse;font-size:14px\">")
	b.WriteString(emailRow("订单号", order.OrderNo))
	b.WriteString(emailRow("金额", order.Currency+" "+order.TotalAmount.String()))
	b.WriteString(emailRow("买家", customerDisplayName(order)))
	b.WriteString(emailRow("买家邮箱", order.CustomerEmail))
	if order.CustomerCountry != "" {
		b.WriteString(emailRow("买家国家/地区", order.CustomerCountry))
	}
	if order.PaypalOrderID != nil && *order.PaypalOrderID != "" {
		b.WriteString(emailRow("支付通道", "PayPal"))
	} else {
		b.WriteString(emailRow("支付通道", "Stripe"))
	}
	b.WriteString("</table>")

	if len(items) > 0 {
		b.WriteString("<h3 style=\"margin:16px 0 8px;font-size:15px\">商品明细</h3>")
		b.WriteString("<table style=\"border-collapse:collapse;font-size:14px;width:100%\">")
		b.WriteString("<tr style=\"background:#f5f5f5\"><th style=\"padding:6px 12px;text-align:left\">商品</th>" +
			"<th style=\"padding:6px 12px;text-align:right\">数量</th>" +
			"<th style=\"padding:6px 12px;text-align:right\">单价</th>" +
			"<th style=\"padding:6px 12px;text-align:right\">小计</th></tr>")
		for _, it := range items {
			b.WriteString(fmt.Sprintf(
				"<tr><td style=\"padding:6px 12px\">%s</td><td style=\"padding:6px 12px;text-align:right\">%d</td>"+
					"<td style=\"padding:6px 12px;text-align:right\">%s %s</td><td style=\"padding:6px 12px;text-align:right\">%s %s</td></tr>",
				html.EscapeString(it.ProductName), it.Quantity,
				html.EscapeString(order.Currency), it.UnitAmount.String(),
				html.EscapeString(order.Currency), it.Amount.String()))
		}
		b.WriteString("</table>")
	}
	b.WriteString("<p style=\"color:#999;font-size:12px;margin-top:16px\">本邮件由行简独立站系统自动发送;后台已同步生成站内/企微通知。</p>")
	b.WriteString("</div>")
	return b.String()
}

// inquiryEmailHTML 新询盘邮件 HTML(线索字段;内容全部 html 转义)。
func inquiryEmailHTML(lead *crmmodel.CrmLead, slug string) string {
	var b strings.Builder
	b.WriteString("<div style=\"font-family:-apple-system,'Segoe UI',Arial,sans-serif;max-width:640px\">")
	b.WriteString("<h2 style=\"margin:0 0 12px\">🌍 独立站新询盘</h2>")
	b.WriteString("<table style=\"border-collapse:collapse;font-size:14px\">")
	b.WriteString(emailRow("姓名", lead.ContactName))
	b.WriteString(emailRow("邮箱", lead.Email))
	b.WriteString(emailRow("公司", lead.Company))
	// CrmLead 无国家字段(仅询盘行存 country),此处留展示位
	b.WriteString(emailRow("国家/地区", ""))
	if slug != "" {
		b.WriteString(emailRow("询盘商品", slug))
	}
	b.WriteString(emailRow("线索编号", lead.LeadNo))
	b.WriteString(emailRow("询盘内容", lead.Remark))
	b.WriteString("</table>")
	b.WriteString("<p style=\"color:#999;font-size:12px;margin-top:16px\">请前往后台「CRM → 线索公海」领取跟进。</p>")
	b.WriteString("</div>")
	return b.String()
}
