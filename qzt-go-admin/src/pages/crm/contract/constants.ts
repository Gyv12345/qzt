import { formatMoney } from '../../../utils/format'

/** 回款计划状态: 0未回款 1部分回款 2已回款 */
export const PLAN_STATUS: Record<number, { text: string; color: string }> = {
  0: { text: '未回款', color: 'default' },
  1: { text: '部分回款', color: 'warning' },
  2: { text: '已回款', color: 'success' },
}

/** 合同审批状态 */
export const APPROVAL_STATUS: Record<string, { text: string; color: string }> = {
  NONE: { text: '未审批', color: 'default' },
  PROCESSING: { text: '审批中', color: 'processing' },
  APPROVED: { text: '已通过', color: 'success' },
  REJECTED: { text: '已驳回', color: 'error' },
  REVOKED: { text: '已撤回', color: 'warning' },
}

/** 金额显示:复用全站 formatMoney(¥ + 千分位 + 两位小数) */
export const money = formatMoney
