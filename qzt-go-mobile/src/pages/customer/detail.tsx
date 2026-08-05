import { useEffect, useState } from 'react'
import { Card, ErrorBlock, List, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { getCustomer } from '../../services/crm'
import type { CrmCustomerDetail } from '../../types/crm'

const STATUS_TEXT: Record<number, string> = { 1: '正常', 2: '冻结', 3: '流失' }

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<CrmCustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getCustomer(Number(id))
      .then((d) => setDetail(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ paddingTop: '40vh', textAlign: 'center' }}>
        <SpinLoading style={{ '--size': '40px' }} />
      </div>
    )
  }
  if (error || !detail) {
    return <ErrorBlock status="default" title="加载失败" description="客户详情获取失败" />
  }

  const { customer, contacts } = detail

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>客户详情</NavBar>

      <Card title="基本信息" style={{ margin: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{customer.name}</span>
          {customer.level && (
            <Tag color="primary" fill="outline">
              {customer.level}
            </Tag>
          )}
          <Tag color={customer.status === 1 ? 'success' : 'default'} fill="outline">
            {STATUS_TEXT[customer.status] || '未知'}
          </Tag>
        </div>
        <List>
          <List.Item extra={customer.customer_no}>客户编号</List.Item>
          <List.Item extra={customer.source || '-'}>来源</List.Item>
          <List.Item extra={customer.industry || '-'}>行业</List.Item>
          <List.Item extra={customer.in_pool ? '公海' : '私海'}>归属</List.Item>
          <List.Item extra={customer.created_at}>创建时间</List.Item>
        </List>
      </Card>

      {contacts && contacts.length > 0 && (
        <Card title={`联系人(${contacts.length})`} style={{ margin: 8 }}>
          <List>
            {contacts.map((ct) => (
              <List.Item
                key={ct.id}
                description={
                  <span style={{ fontSize: 12 }}>
                    {ct.phone ? `📞 ${ct.phone}` : ''}
                    {ct.email ? ` · ✉ ${ct.email}` : ''}
                  </span>
                }
                extra={ct.position || ''}
              >
                {ct.name}
                {ct.is_key_decision_maker === 1 && (
                  <Tag color="warning" fill="outline" style={{ marginLeft: 6 }}>
                    关键决策人
                  </Tag>
                )}
              </List.Item>
            ))}
          </List>
        </Card>
      )}
    </div>
  )
}
