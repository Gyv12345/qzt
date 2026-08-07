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
