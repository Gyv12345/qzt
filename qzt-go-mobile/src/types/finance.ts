// 财务模块类型(移动端子集)

/** 应收应付往来款 */
export interface FinReceivable {
  id: number
  doc_no: string
  direction: string
  party_type: string
  party_id: number | null
  party_name: string
  occur_date: string
  due_date: string | null
  original_amount: string
  settled_amount: string
  biz_type: string
  biz_id: number | null
  status: number
  remark: string
  created_at: string
  updated_at: string
}

export const SETTLE_STATUS: Record<number, { text: string; color: string }> = {
  0: { text: '未结算', color: 'default' },
  1: { text: '部分', color: 'warning' },
  2: { text: '已结清', color: 'success' },
}

export const DIRECTION_TEXT: Record<string, { text: string; color: string }> = {
  RECEIVABLE: { text: '应收', color: 'primary' },
  PAYABLE: { text: '应付', color: 'warning' },
}

/** 会计科目 */
export interface FinAccount {
  id: number
  code: string
  name: string
  type: string
  parent_id: number | null
  balance_dir: string
  level: number
  is_leaf: boolean
  status: number
  sort: number
  remark: string
  created_at: string
}

/** 凭证 */
export interface FinVoucher {
  id: number
  voucher_no: string
  voucher_date: string
  account_id: number
  account_name?: string
  description: string
  direction: string
  amount: string
  currency: string
  biz_type: string
  biz_id: number | null
  status: string
  operator_id: number | null
  remark: string
  created_at: string
}

/** 发票 */
export interface FinInvoice {
  id: number
  invoice_no: string
  invoice_type: string
  direction: string
  invoice_date: string
  amount: string
  tax_rate: string
  tax_amount: string
  total_amount: string
  party_name: string
  party_tax_no: string
  biz_type: string
  biz_id: number | null
  remark: string
  created_at: string
}

export const ACCOUNT_TYPE: Record<string, { text: string; color: string }> = {
  ASSET: { text: '资产', color: 'primary' },
  LIABILITY: { text: '负债', color: 'warning' },
  EQUITY: { text: '权益', color: 'success' },
  INCOME: { text: '收入', color: 'success' },
  EXPENSE: { text: '支出', color: 'danger' },
}

export const BALANCE_DIR: Record<string, string> = {
  DEBIT: '借',
  CREDIT: '贷',
}

export const VOUCHER_STATUS: Record<string, { text: string; color: string }> = {
  DRAFT: { text: '草稿', color: 'default' },
  CONFIRMED: { text: '已过账', color: 'success' },
}

export const INVOICE_TYPE: Record<string, string> = {
  VAT_SPECIAL: '增值税专票',
  VAT_NORMAL: '增值税普票',
  ELECTRONIC: '电子发票',
}

export const INVOICE_DIRECTION: Record<string, { text: string; color: string }> = {
  RECEIVED: { text: '收票', color: 'warning' },
  ISSUED: { text: '开票', color: 'primary' },
}
