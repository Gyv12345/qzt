import { useEffect, useState } from 'react'
import { ActionSheet, Button, Card, Dialog, ErrorBlock, List, NavBar, SpinLoading, Tag, Toast } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { convertLead, getLead, listLeadPools, pickLead, releaseLead, type CrmPool } from '../../services/crm'
import { listFollowTimeline } from '../../services/follow'
import { FOLLOW_TYPE_TEXT, type CrmLead, type FollowUpRecord } from '../../types/crm'
import FollowRecordSheet from '../../components/FollowRecordSheet'
import CustomFieldView from '../../components/CustomFieldView'
import LeadFormSheet from '../../components/LeadFormSheet'
import { useAuthStore } from '../../stores/auth'
import { dialWithDedup } from '../../utils/dial'

const STATUS_TEXT: Record<number, string> = { 1: '新建', 2: '跟进中', 3: '已转化', 4: '无效' }
const STATUS_COLOR: Record<number, string> = {
  1: 'primary',
  2: 'warning',
  3: 'success',
  4: 'default',
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const hasPerm = useAuthStore((s) => s.hasPerm)
  const [detail, setDetail] = useState<CrmLead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [acting, setActing] = useState(false)
  const [follows, setFollows] = useState<FollowUpRecord[]>([])
  const [followSheetOpen, setFollowSheetOpen] = useState(false)
  const [pools, setPools] = useState<CrmPool[]>([])
  const [fields, setFields] = useState<Record<string, string>>({})
  const [showEdit, setShowEdit] = useState(false)

  const loadFollows = (lid: number) => {
    listFollowTimeline('lead_id', lid)
      .then(setFollows)
      .catch(() => {})
  }

  const load = () => {
    if (!id) return
    setLoading(true)
    getLead(Number(id))
      .then((res) => {
        setDetail(res.lead)
        setFields(res.fields || {})
        loadFollows(res.lead.id)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  if (loading) {
    return (
      <div style={{ paddingTop: '40vh', textAlign: 'center' }}>
        <SpinLoading style={{ '--size': '40px' }} />
      </div>
    )
  }
  if (error || !detail) {
    return <ErrorBlock status="default" title="加载失败" description="线索详情获取失败" />
  }

  const lead = detail

  // 拨号:查重拦截后拨号,弹窗内"查看"跳转已有线索/客户
  const onDial = () => {
    dialWithDedup(lead.phone, {
      name: lead.name,
      onPickExisting: (type, rid) => {
        Dialog.clear()
        navigate(type === 'customer' ? `/customer/${rid}` : `/lead/${rid}`)
      },
    })
  }

  // 转化为客户
  const onConvert = async () => {
    const ok = await Dialog.confirm({ content: '确定将该线索转化为客户?' })
    if (!ok) return
    setActing(true)
    try {
      const customer = await convertLead(lead.id)
      Toast.show({ icon: 'success', content: '转化成功' })
      // 跳转到新建客户详情
      if (customer?.id) navigate(`/customer/${customer.id}`, { replace: true })
      else navigate('/customer', { replace: true })
    } catch {
      // 拦截器已 toast
    } finally {
      setActing(false)
    }
  }

  // 领取(从公海)
  const onPick = async () => {
    setActing(true)
    try {
      await pickLead(lead.id)
      Toast.show({ icon: 'success', content: '领取成功' })
      load()
    } catch {
    } finally {
      setActing(false)
    }
  }

  // 释放到公海:单池直接确认,多池 ActionSheet 选池
  const onRelease = async () => {
    let ps = pools
    if (ps.length === 0) {
      try {
        ps = await listLeadPools()
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
        await releaseLead(lead.id, { pool_id: poolId, reason: '手动释放' })
        Toast.show({ icon: 'success', content: '已释放到公海' })
        load()
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

  const inPool = lead.in_pool === 1
  const converted = lead.status === 3

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>线索详情</NavBar>

      <Card title="基本信息" style={{ margin: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{lead.name}</span>
          <Tag color={STATUS_COLOR[lead.status] || 'default'} fill="outline">
            {STATUS_TEXT[lead.status] || '未知'}
          </Tag>
          <Tag color={inPool ? 'default' : 'primary'} fill="outline">
            {inPool ? '公海' : '私海'}
          </Tag>
        </div>
        <List>
          <List.Item extra={lead.lead_no}>线索编号</List.Item>
          {lead.contact_name && <List.Item extra={lead.contact_name}>联系人</List.Item>}
          {lead.company && <List.Item extra={lead.company}>公司</List.Item>}
          {lead.level && <List.Item extra={lead.level}>级别</List.Item>}
          {lead.source && <List.Item extra={lead.source}>来源</List.Item>}
          {lead.industry && <List.Item extra={lead.industry}>行业</List.Item>}
          <List.Item extra={lead.created_at}>创建时间</List.Item>
        </List>
      </Card>

      <Card title="联系方式" style={{ margin: 8 }}>
        <List>
          {lead.phone && (
            <List.Item
              extra={
                <span
                  style={{ color: 'var(--brand)', textDecoration: 'underline' }}
                  onClick={onDial}
                >
                  {lead.phone}
                </span>
              }
              arrow={false}
            >
              电话
            </List.Item>
          )}
          {lead.email && <List.Item extra={lead.email}>邮箱</List.Item>}
          {!lead.phone && !lead.email && (
            <List.Item>
              <span style={{ color: 'var(--text-tertiary)' }}>无联系方式</span>
            </List.Item>
          )}
        </List>
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

      {/* 操作区 */}
      <Card title="操作" style={{ margin: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hasPerm('crm:lead:edit') && !converted && (
            <Button color="primary" size="large" fill="outline" onClick={() => setShowEdit(true)}>
              编辑
            </Button>
          )}
          {lead.phone && (
            <Button color="primary" size="large" onClick={onDial} disabled={acting}>
              📞 拨打电话
            </Button>
          )}

          {/* 已转化:跳转客户 */}
          {converted && lead.converted_customer_id && (
            <Button
              color="primary"
              size="large"
              fill="outline"
              onClick={() => navigate(`/customer/${lead.converted_customer_id}`)}
            >
              查看已转化客户
            </Button>
          )}

          {/* 未转化才允许流转 */}
          {!converted && (
            <>
              {inPool ? (
                hasPerm('crm:lead:pick') && (
                  <Button color="primary" size="large" fill="outline" onClick={onPick} loading={acting}>
                    领取
                  </Button>
                )
              ) : (
                <>
                  {hasPerm('crm:lead:edit') && (
                    <Button color="success" size="large" fill="outline" onClick={onConvert} loading={acting}>
                      转化为客户
                    </Button>
                  )}
                  {hasPerm('crm:lead:edit') && (
                    <Button color="warning" size="large" fill="outline" onClick={onRelease} loading={acting}>
                      释放到公海
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </div>
        {!converted && !inPool && !hasPerm('crm:lead:edit') && (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 8 }}>
            无操作权限
          </div>
        )}
      </Card>

      <FollowRecordSheet
        visible={followSheetOpen}
        onClose={() => setFollowSheetOpen(false)}
        leadId={lead.id}
        onSubmitted={() => loadFollows(lead.id)}
      />

      <CustomFieldView formKey="LEAD" values={fields} />

      <LeadFormSheet
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        lead={lead}
        fields={fields}
        onSubmitted={load}
      />
    </div>
  )
}
