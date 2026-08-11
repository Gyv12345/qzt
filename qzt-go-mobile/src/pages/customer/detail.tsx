import { useEffect, useState } from 'react'
import { Button, Card, ErrorBlock, List, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { getCustomer } from '../../services/crm'
import { listFollowTimeline } from '../../services/follow'
import { FOLLOW_TYPE_TEXT, type CrmCustomerDetail, type FollowUpRecord } from '../../types/crm'
import { dialWithDedup } from '../../utils/dial'
import FollowRecordSheet from '../../components/FollowRecordSheet'
import ContactSheet from '../../components/ContactSheet'
import CustomFieldView from '../../components/CustomFieldView'

const STATUS_TEXT: Record<number, string> = { 1: '正常', 2: '冻结', 3: '流失' }

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<CrmCustomerDetail | null>(null)
  const [follows, setFollows] = useState<FollowUpRecord[]>([])
  const [followSheetOpen, setFollowSheetOpen] = useState(false)
  const [contactSheetOpen, setContactSheetOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadFollows = (cid: number) => {
    listFollowTimeline('customer_id', cid)
      .then(setFollows)
      .catch(() => {})
  }

  // 联系人拨号:查重拦截后拨号,弹窗内"查看"跳转已有线索/客户
  const onDialContact = (phone: string, name?: string) => {
    dialWithDedup(phone, {
      name,
      onPickExisting: (type, rid) => {
        navigate(type === 'customer' ? `/customer/${rid}` : `/lead/${rid}`)
      },
    })
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getCustomer(Number(id))
      .then((d) => {
        setDetail(d)
        loadFollows(d.customer.id)
      })
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

      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 4 }}>
            <span>联系人{contacts && contacts.length > 0 ? `(${contacts.length})` : ''}</span>
            <Button size="small" color="primary" onClick={() => setContactSheetOpen(true)}>
              新增
            </Button>
          </div>
        }
        style={{ margin: 8 }}
      >
        {contacts && contacts.length > 0 ? (
          <List>
            {contacts.map((ct) => (
              <List.Item
                key={ct.id}
                description={
                  <span style={{ fontSize: 12 }}>
                    {ct.phone && (
                      <span
                        style={{ color: 'var(--brand)', textDecoration: 'underline' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onDialContact(ct.phone, ct.name)
                        }}
                      >
                        📞 {ct.phone}
                      </span>
                    )}
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
        ) : (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '8px 0' }}>暂无联系人</div>
        )}
      </Card>

      <Card
        title="跟进记录"
        style={{ margin: 8 }}
        extra={
          <Button size="small" color="primary" onClick={() => setFollowSheetOpen(true)}>
            写跟进
          </Button>
        }
      >
        {follows.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '8px 0' }}>暂无跟进记录</div>
        ) : (
          <List>
            {follows.map((f) => (
              <List.Item
                key={f.id}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{f.follow_time}</span>}
                extra={<Tag fill="outline" color="primary">{FOLLOW_TYPE_TEXT[f.type] || f.type}</Tag>}
              >
                {f.content}
              </List.Item>
            ))}
          </List>
        )}
      </Card>

      <FollowRecordSheet
        visible={followSheetOpen}
        onClose={() => setFollowSheetOpen(false)}
        customerId={customer.id}
        onSubmitted={() => loadFollows(customer.id)}
      />

      <CustomFieldView formKey="CUSTOMER" values={detail.fields} />

      <ContactSheet
        visible={contactSheetOpen}
        onClose={() => setContactSheetOpen(false)}
        customerId={customer.id}
        onSubmitted={() => {
          if (id)
            getCustomer(Number(id))
              .then((d) => {
                setDetail(d)
                loadFollows(d.customer.id)
              })
              .catch(() => {})
        }}
      />
    </div>
  )
}
