import { useEffect, useState } from 'react'
import { ActionSheet, Button, Card, Dialog, ErrorBlock, List, NavBar, SpinLoading, Tag, Toast } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { getCustomer, listCustomerPools, listOpportunities, listContracts, pickCustomer, releaseCustomer, type CrmPool } from '../../services/crm'
import { listFollowTimeline } from '../../services/follow'
import { FOLLOW_TYPE_TEXT, type CrmCustomerDetail, type CrmOpportunity, type CrmContract, type CrmContact, type FollowUpRecord } from '../../types/crm'
import { dialWithDedup } from '../../utils/dial'
import { useAuthStore } from '../../stores/auth'
import FollowRecordSheet from '../../components/FollowRecordSheet'
import ContactSheet from '../../components/ContactSheet'
import CustomFieldView from '../../components/CustomFieldView'
import CustomerFormSheet from '../../components/CustomerFormSheet'

const STATUS_TEXT: Record<number, string> = { 1: '正常', 2: '冻结', 3: '流失' }

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const hasPerm = useAuthStore((s) => s.hasPerm)
  const [detail, setDetail] = useState<CrmCustomerDetail | null>(null)
  const [follows, setFollows] = useState<FollowUpRecord[]>([])
  const [followSheetOpen, setFollowSheetOpen] = useState(false)
  const [contactSheetOpen, setContactSheetOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [acting, setActing] = useState(false)
  const [pools, setPools] = useState<CrmPool[]>([])
  const [opps, setOpps] = useState<CrmOpportunity[]>([])
  const [contracts, setContracts] = useState<CrmContract[]>([])
  const [editingContact, setEditingContact] = useState<CrmContact | null>(null)
  const [showEdit, setShowEdit] = useState(false)

  const loadFollows = (cid: number) => {
    listFollowTimeline('customer_id', cid)
      .then(setFollows)
      .catch(() => {})
  }

  const reload = () => {
    if (!id) return
    setLoading(true)
    getCustomer(Number(id))
      .then((d) => {
        setDetail(d)
        loadFollows(d.customer.id)
        listOpportunities({ customer_id: d.customer.id, page: 1, page_size: 50 })
          .then((r) => setOpps(r.list || []))
          .catch(() => {})
        listContracts({ customer_id: d.customer.id, page: 1, page_size: 50 })
          .then((r) => setContracts(r.list || []))
          .catch(() => {})
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
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

  // 领取客户(从公海)
  const onPick = async () => {
    setActing(true)
    try {
      await pickCustomer(Number(id))
      Toast.show({ icon: 'success', content: '领取成功' })
      reload()
    } catch {
      // 拦截器已 toast
    } finally {
      setActing(false)
    }
  }

  // 释放到公海:单池直接确认,多池 ActionSheet 选池
  const onRelease = async () => {
    let ps = pools
    if (ps.length === 0) {
      try {
        ps = await listCustomerPools()
        setPools(ps)
      } catch {
        return
      }
    }
    if (ps.length === 0) {
      Toast.show({ content: '暂无可用公海池' })
      return
    }
    const doRelease = async (poolId: number) => {
      setActing(true)
      try {
        await releaseCustomer(Number(id), { pool_id: poolId, reason: '手动释放' })
        Toast.show({ icon: 'success', content: '已释放到公海' })
        reload()
      } catch {
      } finally {
        setActing(false)
      }
    }
    if (ps.length === 1) {
      const ok = await Dialog.confirm({ content: `确定释放到公海「${ps[0].name}」?` })
      if (ok) await doRelease(ps[0].id)
    } else {
      ActionSheet.show({
        actions: ps.map((p) => ({ text: p.name, key: p.id })),
        cancelText: '取消',
        onAction: (_item, index) => {
          doRelease(ps[index].id)
        },
      })
    }
  }

  useEffect(reload, [id])

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
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {ct.position && (
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{ct.position}</span>
                    )}
                    <a
                      style={{ fontSize: 12, color: 'var(--brand)' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingContact(ct)
                      }}
                    >
                      编辑
                    </a>
                  </div>
                }
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

      {/* 商机关联 */}
      <Card
        title={<span>商机{opps.length > 0 ? `(${opps.length})` : ''}</span>}
        style={{ margin: 8 }}
      >
        {opps.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '8px 0' }}>暂无关联商机</div>
        ) : (
          <List>
            {opps.map((o) => (
              <List.Item
                key={o.id}
                onClick={() => navigate(`/opportunity/${o.id}`)}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {o.expected_close_date ? o.expected_close_date.slice(0, 10) : ''}
                    {o.expected_amount && o.expected_amount !== '0' ? ` · ¥${o.expected_amount}` : ''}
                  </span>
                }
                extra={<Tag fill="outline" color="primary">{o.stage}</Tag>}
              >
                {o.name}
              </List.Item>
            ))}
          </List>
        )}
      </Card>

      {/* 合同关联 */}
      <Card
        title={<span>合同{contracts.length > 0 ? `(${contracts.length})` : ''}</span>}
        style={{ margin: 8 }}
      >
        {contracts.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '8px 0' }}>暂无关联合同</div>
        ) : (
          <List>
            {contracts.map((c) => (
              <List.Item
                key={c.id}
                onClick={() => navigate(`/contract/${c.id}`)}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{c.contract_no}</span>}
                extra={
                  <span style={{ fontSize: 12, color: 'var(--brand)' }}>
                    ¥{Number(c.total_amount || '0').toLocaleString('zh-CN')}
                  </span>
                }
              >
                {c.name}
              </List.Item>
            ))}
          </List>
        )}
      </Card>

      {/* 操作区:编辑 / 公海领取 / 释放到公海 */}
      <Card title="操作" style={{ margin: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hasPerm('crm:customer:edit') && (
            <Button color="primary" size="large" fill="outline" onClick={() => setShowEdit(true)}>
              编辑
            </Button>
          )}
          {customer.in_pool ? (
            hasPerm('crm:customer:pick') && (
              <Button color="primary" size="large" fill="outline" onClick={onPick} loading={acting}>
                领取
              </Button>
            )
          ) : (
            hasPerm('crm:customer:release') && (
              <Button color="warning" size="large" fill="outline" onClick={onRelease} loading={acting}>
                释放到公海
              </Button>
            )
          )}
        </div>
      </Card>

      <CustomFieldView formKey="CUSTOMER" values={detail.fields} />

      <ContactSheet
        visible={contactSheetOpen || !!editingContact}
        onClose={() => {
          setContactSheetOpen(false)
          setEditingContact(null)
        }}
        customerId={customer.id}
        contact={editingContact}
        onSubmitted={reload}
      />

      <CustomerFormSheet visible={showEdit} onClose={() => setShowEdit(false)} detail={detail} onSubmitted={reload} />
    </div>
  )
}
