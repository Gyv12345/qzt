// dial.ts 查重拦截拨号工具。
// 拨号前调用 /crm/dedup 检索相似线索/客户,有命中则弹窗提示(可跳转已有记录或继续拨号),
// 无命中或查询失败则直接拨号(不阻断业务)。被线索详情、客户详情共用。

import { Dialog, Toast } from 'antd-mobile'
import type { CSSProperties } from 'react'
import { dedup } from '../services/crm'
import type { DedupResult } from '../types/crm'

/** 拨号:直接触发系统拨号面板 */
function rawDial(phone: string) {
  window.location.href = `tel:${phone}`
}

/** 点击"查看已有记录"的回调类型 */
export type PickExisting = (type: 'lead' | 'customer', id: number) => void

interface DialOptions {
  /** 用于查重的名称(线索名称/客户名称/联系人姓名),可选 */
  name?: string
  /** 点击相似记录"查看"时的跳转回调;不传则不显示查看按钮 */
  onPickExisting?: PickExisting
}

/**
 * 查重拦截拨号。
 * 1. 用 name + phone 查 /crm/dedup
 * 2. 无相似 → 直接拨号
 * 3. 有相似 → 弹窗列出(可"查看"已有记录),"继续拨号"才真正拨号
 * 4. 查重失败 → Toast 提示后降级直接拨号(不阻断外呼)
 */
export async function dialWithDedup(phone: string, opts: DialOptions = {}) {
  const { name, onPickExisting } = opts
  if (!phone) {
    Toast.show({ content: '电话号码为空' })
    return
  }

  // 无任何查重条件时直接拨号(无法查重)
  if (!name && !phone) {
    rawDial(phone)
    return
  }

  let result: DedupResult | null = null
  try {
    result = await dedup({ name: name || undefined, phone })
  } catch {
    // 查重失败不阻断业务,提示后直接拨号
    Toast.show({ icon: 'fail', content: '查重失败,已直接发起拨号' })
    rawDial(phone)
    return
  }

  const total = (result?.leads?.length || 0) + (result?.customers?.length || 0)
  if (total === 0) {
    rawDial(phone)
    return
  }

  // 有相似记录,弹窗提示
  const confirmed = await Dialog.confirm({
    title: `发现 ${total} 条相似记录`,
    content: renderSimilarList(result!, onPickExisting),
    confirmText: '继续拨号',
    cancelText: '取消',
  })
  if (confirmed) rawDial(phone)
}

/** 渲染相似记录列表(线索 + 客户),每条可点"查看"跳转 */
function renderSimilarList(result: DedupResult, onPickExisting?: PickExisting) {
  const leadRows = (result.leads || []).map((l) => (
    <div key={`l${l.id}`} style={rowStyle}>
      <div style={{ flex: 1 }}>
        <div style={titleStyle}>
          <span style={badgeStyle('#fff7e6', '#fa8c16')}>线索</span>
          {l.name}
        </div>
        <div style={descStyle}>
          {[l.contact_name, l.phone, l.company].filter(Boolean).join(' · ') || '无补充信息'}
        </div>
      </div>
      {onPickExisting && (
        <span style={linkStyle} onClick={() => onPickExisting('lead', l.id)}>
          查看
        </span>
      )}
    </div>
  ))

  const custRows = (result.customers || []).map((c) => (
    <div key={`c${c.id}`} style={rowStyle}>
      <div style={{ flex: 1 }}>
        <div style={titleStyle}>
          <span style={badgeStyle('#e6f4ff', '#1677ff')}>客户</span>
          {c.name}
        </div>
        <div style={descStyle}>{c.customer_no}</div>
      </div>
      {onPickExisting && (
        <span style={linkStyle} onClick={() => onPickExisting('customer', c.id)}>
          查看
        </span>
      )}
    </div>
  ))

  return (
    <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
      <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 8 }}>
        拨号前请确认是否为重复联系:
      </div>
      {leadRows}
      {custRows}
    </div>
  )
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 0',
  borderTop: '1px solid #f0f0f0',
}
const titleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 14,
  fontWeight: 500,
  color: '#262626',
}
const descStyle: CSSProperties = {
  fontSize: 12,
  color: '#8c8c8c',
  marginTop: 2,
}
const linkStyle: CSSProperties = {
  color: '#1677ff',
  fontSize: 13,
  padding: '4px 8px',
  flexShrink: 0,
}
const badgeStyle = (bg: string, color: string): CSSProperties => ({
  display: 'inline-block',
  background: bg,
  color,
  fontSize: 11,
  padding: '1px 6px',
  borderRadius: 4,
  fontWeight: 400,
})
