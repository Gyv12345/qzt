// 财务管理模块(finance)API 契约类型,与 qzt-go-server 内部 model/finance 对齐
// 注意:金额/税率字段后端以字符串(decimal)返回;时间字段为 "yyyy-MM-dd HH:mm:ss" 字符串

// ── 会计科目 ──

/** 科目类型:ASSET 资产 / LIABILITY 负债 / EQUITY 权益 / INCOME 收入 / EXPENSE 支出 */
/** 余额方向:DEBIT 借 / CREDIT 贷 */

/** 会计科目 */
export interface FinAccount {
  id: number
  /** 科目编码,如 1001 */
  code: string
  name: string
  /** ASSET/LIABILITY/EQUITY/INCOME/EXPENSE */
  type: string
  /** 父科目 ID,顶级为 null */
  parent_id: number | null
  /** DEBIT/CREDIT */
  balance_dir: string
  /** 科目层级 */
  level: number
  /** 是否末级科目 */
  is_leaf: boolean
  /** 1 启用 0 停用 */
  status: number
  sort: number
  remark: string
  created_at: string
  updated_at: string
}

/** 创建科目请求 */
export interface CreateAccountPayload {
  code: string
  name: string
  /** ASSET/LIABILITY/EQUITY/INCOME/EXPENSE */
  type: string
  parent_id?: number
  /** DEBIT/CREDIT */
  balance_dir: string
  level?: number
  is_leaf?: boolean
  sort?: number
  remark?: string
}

// ── 记账凭证 ──

/** 记账凭证 */
export interface FinVoucher {
  id: number
  /** 凭证号 */
  voucher_no: string
  /** 凭证日期 yyyy-MM-dd HH:mm:ss */
  voucher_date: string
  account_id: number
  description: string
  /** DEBIT 借方 / CREDIT 贷方 */
  direction: string
  /** 金额(decimal 字符串) */
  amount: string
  /** 币种,默认 CNY */
  currency: string
  /** 业务类型,如 CONTRACT_PAYMENT/PURCHASE/SALES */
  biz_type: string
  /** 关联业务 ID */
  biz_id: number | null
  /** DRAFT 草稿 / CONFIRMED 已确认 */
  status: string
  /** 制单人 ID */
  operator_id: number | null
  remark: string
  created_at: string
  updated_at: string
}

/** 创建凭证请求 */
export interface CreateVoucherPayload {
  account_id: number
  /** 凭证日期 yyyy-MM-dd */
  voucher_date: string
  description: string
  /** DEBIT/CREDIT */
  direction: string
  /** 金额,字符串(decimal) */
  amount: string
  biz_type?: string
  biz_id?: number
  remark?: string
}

// ── 发票管理 ──

/** 发票方向:RECEIVED 收到 / ISSUED 开出 */
/** 发票类型:VAT_SPECIAL 增值税专用发票 / VAT_NORMAL 增值税普通发票 / ELECTRONIC 电子发票 */

/** 发票 */
export interface FinInvoice {
  id: number
  /** 发票号 */
  invoice_no: string
  /** VAT_SPECIAL/VAT_NORMAL/ELECTRONIC */
  invoice_type: string
  /** RECEIVED/ISSUED */
  direction: string
  /** 开票日期 yyyy-MM-dd HH:mm:ss */
  invoice_date: string
  /** 金额(decimal 字符串) */
  amount: string
  /** 税率(decimal 字符串,如 "0.13") */
  tax_rate: string
  /** 税额(decimal 字符串,后端计算) */
  tax_amount: string
  /** 价税合计(decimal 字符串,后端计算) */
  total_amount: string
  /** 对方名称 */
  party_name: string
  /** 对方税号 */
  party_tax_no: string
  /** 业务类型 */
  biz_type: string
  /** 关联业务 ID */
  biz_id: number | null
  remark: string
  created_at: string
  updated_at: string
}

/** 创建发票请求 */
export interface CreateInvoicePayload {
  invoice_no: string
  /** VAT_SPECIAL/VAT_NORMAL/ELECTRONIC */
  invoice_type: string
  /** RECEIVED/ISSUED */
  direction: string
  /** 开票日期 yyyy-MM-dd */
  invoice_date: string
  /** 金额,字符串(decimal) */
  amount: string
  tax_rate?: string
  party_name?: string
  party_tax_no?: string
  biz_type?: string
  biz_id?: number
  remark?: string
}

// ── 财务报表 ──

/** 利润表 */
export interface IncomeStatement {
  /** 营业收入(decimal 字符串) */
  revenue: string
  /** 营业成本(decimal 字符串) */
  cogs: string
  /** 毛利润(decimal 字符串) */
  gross_profit: string
  /** 净利润(decimal 字符串) */
  net_profit: string
}

/** 资产负债表 */
export interface BalanceSheet {
  /** 资产总额(decimal 字符串) */
  total_assets: string
  /** 负债总额(decimal 字符串) */
  total_liabilities: string
  /** 所有者权益(decimal 字符串) */
  total_equity: string
}

// ── 应收应付往来 ──

/** 往来款(应收/应付) */
export interface FinReceivable {
  id: number
  doc_no: string
  /** RECEIVABLE 应收 / PAYABLE 应付 */
  direction: string
  /** CUSTOMER/SUPPLIER/EMPLOYEE */
  party_type: string
  party_id: number | null
  party_name: string
  occur_date: string
  due_date: string | null
  original_amount: string
  settled_amount: string
  biz_type: string
  biz_id: number | null
  /** 0未结算 1部分 2已结清 */
  status: number
  remark: string
  created_at: string
  updated_at: string
}

/** 结算状态映射 */
export const SETTLE_STATUS: Record<number, { text: string; color: string }> = {
  0: { text: '未结算', color: 'default' },
  1: { text: '部分', color: 'warning' },
  2: { text: '已结清', color: 'success' },
}
