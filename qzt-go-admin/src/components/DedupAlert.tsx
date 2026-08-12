import { useEffect, useRef, useState } from 'react'
import { Alert } from 'antd'
import request from '../utils/request'
import { useUserStore } from '../stores/users'

interface DedupLead {
  id: number
  name: string
  contact_name: string
  phone: string
  company: string
  status: number
  owner_id: number | null
}

interface DedupCustomer {
  id: number
  name: string
  customer_no: string
  status: number
  owner_id: number | null
}

interface DedupResult {
  leads: DedupLead[]
  customers: DedupCustomer[]
}

interface DedupAlertProps {
  /** 名称(模糊匹配线索名称/联系人/公司、客户名称) */
  name?: string
  /** 电话(精确匹配线索电话、客户联系人电话) */
  phone?: string
  /** 排除自身(编辑场景传当前记录 id+类型) */
  excludeType?: 'LEAD' | 'CUSTOMER'
  excludeId?: number
  /** 额外排除的客户 id(如线索编辑时排除该线索已转化成的客户) */
  excludeCustomerIds?: number[]
}

/**
 * 录入查重提示:名称/电话输入后 500ms 防抖查询,
 * 跨线索+客户检索相似记录,仅提示不拦截。无相似记录时不渲染。
 */
export default function DedupAlert({ name, phone, excludeType, excludeId, excludeCustomerIds }: DedupAlertProps) {
  const nickname = useUserStore((s) => s.nickname)
  const [result, setResult] = useState<DedupResult | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    const n = name?.trim()
    const p = phone?.trim()
    if (!n && !p) {
      setResult(null)
      return
    }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      request
        .get<unknown, DedupResult>('/crm/dedup', { params: { name: n, phone: p } })
        .then((res) => setResult(res))
        .catch(() => setResult(null))
    }, 500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [name, phone])

  const leads = (result?.leads ?? []).filter((l) => !(excludeType === 'LEAD' && l.id === excludeId))
  const customers = (result?.customers ?? []).filter(
    (c) => !(excludeType === 'CUSTOMER' && c.id === excludeId) && !excludeCustomerIds?.includes(c.id),
  )
  if (leads.length === 0 && customers.length === 0) return null

  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 16 }}
      message={`发现 ${leads.length + customers.length} 条相似记录,请确认是否重复录入`}
      description={
        <div style={{ fontSize: 13 }}>
          {customers.map((c) => (
            <div key={`c${c.id}`}>
              【客户】{c.name}
              {c.customer_no ? `(${c.customer_no})` : ''} · 负责人:{nickname(c.owner_id)}
            </div>
          ))}
          {leads.map((l) => (
            <div key={`l${l.id}`}>
              【线索】{l.name}
              {l.company ? `(${l.company})` : ''}
              {l.phone ? ` · 电话:${l.phone}` : ''} · 负责人:{nickname(l.owner_id)}
            </div>
          ))}
        </div>
      }
    />
  )
}
