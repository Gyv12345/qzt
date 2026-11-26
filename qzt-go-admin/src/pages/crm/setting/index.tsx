import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
  Tag,
  message,
} from 'antd'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import Auth from '../../../components/Auth'
import UserSelect from '../../../components/UserSelect'
import { batchUpdateConfigs, listConfigs, refreshConfigCache } from '../../../services/system'
import { listContractTemplates } from '../../../services/crm'
import type { CrmContractTemplate } from '../../../types/crm'

// CRM 配置键(与后端 sys_config key 一致)
const KEYS = {
  warnCustomer: 'crm.followup.warn_days_customer',
  warnLead: 'crm.followup.warn_days_lead',
  warnOpp: 'crm.followup.warn_days_opportunity',
  remindEnabled: 'crm.followup.remind_enabled',
  autoRecycle: 'crm.pool.auto_recycle_enabled',
  autoAssignEnabled: 'crm.lead.auto_assign_enabled',
  autoAssignRules: 'crm.lead.auto_assign_rules',
}

/** 线索自动分配规则(与后端 JSON 结构一致) */
interface CrmLeadAutoAssignRule {
  source?: string
  level?: string
  industry?: string
  user_id: number
  enabled: boolean
}

/** 编辑态:user_id 未选时为 undefined */
type EditingRule = Omit<CrmLeadAutoAssignRule, 'user_id'> & { user_id?: number }

const parseAutoAssignRules = (v?: string): EditingRule[] => {
  if (!v) return []
  try {
    const arr = JSON.parse(v)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((r): r is CrmLeadAutoAssignRule => !!r && typeof r === 'object')
      .map((r) => ({
        source: r.source ?? '',
        level: r.level ?? '',
        industry: r.industry ?? '',
        user_id: r.user_id,
        enabled: !!r.enabled,
      }))
  } catch {
    return []
  }
}

interface FollowupForm {
  warn_customer: number
  warn_lead: number
  warn_opp: number
  remind_enabled: boolean
}

interface PoolForm {
  auto_recycle_enabled: boolean
}

export default function CrmSettingPage() {
  const navigate = useNavigate()
  const [followForm] = Form.useForm<FollowupForm>()
  const [poolForm] = Form.useForm<PoolForm>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<CrmContractTemplate[]>([])
  // 线索自动分配
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false)
  const [assignRules, setAssignRules] = useState<EditingRule[]>([])

  useEffect(() => {
    // 拉 crm 组配置 + 合同模板列表
    Promise.all([listConfigs('crm'), listContractTemplates({ page: 1, page_size: 10 })])
      .then(([configs, tplRes]) => {
        const map = new Map(configs.map((c) => [c.key, c.value]))
        followForm.setFieldsValue({
          warn_customer: Number(map.get(KEYS.warnCustomer) ?? 15),
          warn_lead: Number(map.get(KEYS.warnLead) ?? 7),
          warn_opp: Number(map.get(KEYS.warnOpp) ?? 15),
          remind_enabled: (map.get(KEYS.remindEnabled) ?? '1') !== '0',
        })
        poolForm.setFieldsValue({
          auto_recycle_enabled: (map.get(KEYS.autoRecycle) ?? '1') !== '0',
        })
        setAutoAssignEnabled((map.get(KEYS.autoAssignEnabled) ?? '0') === '1')
        setAssignRules(parseAutoAssignRules(map.get(KEYS.autoAssignRules)))
        setTemplates(tplRes.list || [])
      })
      .finally(() => setLoading(false))
    // followForm/poolForm 为 Form.useForm 稳定实例,补齐依赖满足 exhaustive-deps
  }, [followForm, poolForm])

  // 保存跟进配置
  const onFollowupSave = async (v: FollowupForm) => {
    setSaving(true)
    try {
      await batchUpdateConfigs([
        { key: KEYS.warnCustomer, value: String(v.warn_customer) },
        { key: KEYS.warnLead, value: String(v.warn_lead) },
        { key: KEYS.warnOpp, value: String(v.warn_opp) },
        { key: KEYS.remindEnabled, value: v.remind_enabled ? '1' : '0' },
      ])
      await refreshConfigCache()
      message.success('跟进配置已保存')
    } finally {
      setSaving(false)
    }
  }

  // 保存公海配置
  const onPoolSave = async (v: PoolForm) => {
    setSaving(true)
    try {
      await batchUpdateConfigs([{ key: KEYS.autoRecycle, value: v.auto_recycle_enabled ? '1' : '0' }])
      await refreshConfigCache()
      message.success('公海配置已保存')
    } finally {
      setSaving(false)
    }
  }

  // ---------- 线索自动分配 ----------

  const updateAssignRule = (idx: number, patch: Partial<EditingRule>) => {
    setAssignRules((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const moveAssignRule = (idx: number, dir: -1 | 1) => {
    setAssignRules((rs) => {
      const next = [...rs]
      const j = idx + dir
      if (j < 0 || j >= next.length) return rs
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })
  }

  const removeAssignRule = (idx: number) => {
    setAssignRules((rs) => rs.filter((_, i) => i !== idx))
  }

  const addAssignRule = () => {
    setAssignRules((rs) => [...rs, { enabled: true }])
  }

  // 保存自动分配配置:启用的规则必须已选分配用户
  const onAutoAssignSave = async () => {
    if (assignRules.some((r) => r.enabled && !r.user_id)) {
      message.warning('启用的分配规则必须选择分配用户')
      return
    }
    setSaving(true)
    try {
      await batchUpdateConfigs([
        { key: KEYS.autoAssignEnabled, value: autoAssignEnabled ? '1' : '0' },
        { key: KEYS.autoAssignRules, value: JSON.stringify(assignRules) },
      ])
      await refreshConfigCache()
      message.success('线索自动分配配置已保存')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 120 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Card title="CRM 配置" bordered={false}>
      <Tabs
        defaultActiveKey="followup"
        type="line"
        items={[
          {
            key: 'followup',
            label: '跟进设置',
            children: (
              <>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="超过设定天数未跟进的客户/线索/商机,将由定时任务(每日 09:00)推送站内信提醒相关负责人。"
                />
                <Form<FollowupForm>
                  form={followForm}
                  layout="vertical"
                  style={{ maxWidth: 520 }}
                  onFinish={onFollowupSave}
                >
                  <Form.Item
                    name="warn_customer"
                    label="客户未跟进预警天数"
                    rules={[{ required: true, message: '请输入' }]}
                  >
                    <InputNumber min={1} max={365} addonAfter="天" style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="warn_lead"
                    label="线索未跟进预警天数"
                    rules={[{ required: true, message: '请输入' }]}
                  >
                    <InputNumber min={1} max={365} addonAfter="天" style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="warn_opp"
                    label="商机未跟进预警天数"
                    rules={[{ required: true, message: '请输入' }]}
                  >
                    <InputNumber min={1} max={365} addonAfter="天" style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="remind_enabled" label="定时提醒开关" valuePropName="checked">
                    <Switch checkedChildren="开" unCheckedChildren="关" />
                  </Form.Item>
                  <Auth perm="system:config:edit">
                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={saving}>
                        保存
                      </Button>
                    </Form.Item>
                  </Auth>
                </Form>
                <Card size="small" type="inner" title="跟进类型字典" style={{ maxWidth: 520, marginTop: 8 }}>
                  <Space>
                    <span style={{ color: '#888' }}>电话 / 微信 / 上门 / 邮件 / 其他</span>
                    <Button type="link" size="small" onClick={() => navigate('/system/dict')}>
                      管理字典 ›
                    </Button>
                  </Space>
                </Card>
              </>
            ),
          },
          {
            key: 'pool',
            label: '公海设置',
            children: (
              <>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="开启后,定时任务(每日 02:00)扫描公海池中标记「自动回收」的池,按各池的回收规则把超期未跟进的私海客户/线索收回公海。"
                />
                <Form<PoolForm>
                  form={poolForm}
                  layout="vertical"
                  style={{ maxWidth: 520 }}
                  onFinish={onPoolSave}
                >
                  <Form.Item name="auto_recycle_enabled" label="公海自动回收总开关" valuePropName="checked">
                    <Switch checkedChildren="开" unCheckedChildren="关" />
                  </Form.Item>
                  <Auth perm="system:config:edit">
                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={saving}>
                        保存
                      </Button>
                    </Form.Item>
                  </Auth>
                </Form>
                <Card size="small" type="inner" title="各池规则配置" style={{ maxWidth: 520, marginTop: 8 }}>
                  <Space direction="vertical">
                    <span style={{ color: '#888' }}>在各公海池页面配置具体的领取规则、回收规则、容量。</span>
                    <Space>
                      <Button type="link" size="small" onClick={() => navigate('/crm/pool')}>
                        客户公海池 ›
                      </Button>
                      <Button type="link" size="small" onClick={() => navigate('/crm/lead-pool')}>
                        线索公海池 ›
                      </Button>
                    </Space>
                  </Space>
                </Card>
              </>
            ),
          },
          {
            key: 'autoAssign',
            label: '自动分配',
            children: (
              <>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="仅对新入公海线索（官网留言/抖音同步）生效。按顺序取第一条「所有非空条件均命中」的规则；条件留空=该维度不限制；全空=兜底规则；目标用户须启用，否则跳过该条尝试下一条。"
                />
                <div style={{ maxWidth: 980 }}>
                  <div style={{ marginBottom: 16 }}>
                    <Switch
                      checked={autoAssignEnabled}
                      onChange={setAutoAssignEnabled}
                      checkedChildren="开"
                      unCheckedChildren="关"
                    />
                    <span style={{ marginLeft: 8 }}>线索自动分配总开关</span>
                  </div>
                  {assignRules.map((r, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: 8,
                        marginBottom: 8,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Input
                        style={{ width: 230 }}
                        placeholder="来源:官网留言/抖音广告等,留空=不限"
                        value={r.source}
                        onChange={(e) => updateAssignRule(idx, { source: e.target.value })}
                      />
                      <Select
                        style={{ width: 130 }}
                        placeholder="等级(空=不限)"
                        allowClear
                        value={r.level || undefined}
                        options={[
                          { value: 'A', label: 'A=高' },
                          { value: 'B', label: 'B=中' },
                          { value: 'C', label: 'C=低' },
                        ]}
                        onChange={(v) => updateAssignRule(idx, { level: v })}
                      />
                      <Input
                        style={{ width: 160 }}
                        placeholder="行业,留空=不限"
                        value={r.industry}
                        onChange={(e) => updateAssignRule(idx, { industry: e.target.value })}
                      />
                      <UserSelect
                        style={{ width: 160 }}
                        placeholder="分配给(必填)"
                        value={r.user_id}
                        onChange={(v) => updateAssignRule(idx, { user_id: v as number | undefined })}
                      />
                      <Switch
                        size="small"
                        checked={r.enabled}
                        onChange={(v) => updateAssignRule(idx, { enabled: v })}
                      />
                      <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={idx === 0}
                        onClick={() => moveAssignRule(idx, -1)}
                      />
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={idx === assignRules.length - 1}
                        onClick={() => moveAssignRule(idx, 1)}
                      />
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeAssignRule(idx)} />
                    </div>
                  ))}
                  <Auth perm="system:config:edit">
                    <div style={{ marginTop: 8, marginBottom: 16 }}>
                      <Button icon={<PlusOutlined />} onClick={addAssignRule}>
                        添加规则
                      </Button>
                    </div>
                  </Auth>
                  <Auth perm="system:config:edit">
                    <Button type="primary" loading={saving} onClick={onAutoAssignSave}>
                      保存
                    </Button>
                  </Auth>
                </div>
              </>
            ),
          },
          {
            key: 'template',
            label: '合同模板',
            children: (
              <>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>
                    合同模板用于套打:支持 ${'{变量}'} 占位符,正文为 Markdown。
                  </span>
                  <Auth perm="crm:contractTemplate:add">
                    <Button type="primary" onClick={() => navigate('/crm/contract-template')}>
                      管理模板 ›
                    </Button>
                  </Auth>
                </div>
                <Card size="small" type="inner" title={`已有模板(${templates.length})`}>
                  {templates.length === 0 ? (
                    <span style={{ color: '#888' }}>暂无模板</span>
                  ) : (
                    <Space wrap>
                      {templates.map((t) => (
                        <Tag
                          key={t.id}
                          color={t.enabled ? 'blue' : 'default'}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate('/crm/contract-template')}
                        >
                          {t.name}
                        </Tag>
                      ))}
                    </Space>
                  )}
                </Card>
              </>
            ),
          },
          {
            key: 'more',
            label: '其他配置',
            children: (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Card size="small" type="inner" title="自定义字段" extra={<Button type="link" size="small" onClick={() => navigate('/crm/field')}>前往 ›</Button>}>
                  <span style={{ color: '#888' }}>配置客户/商机/合同/产品/跟进记录的表单字段。</span>
                </Card>
                <Card size="small" type="inner" title="阶段配置" extra={<Button type="link" size="small" onClick={() => navigate('/crm/stage')}>前往 ›</Button>}>
                  <span style={{ color: '#888' }}>配置商机/合同的阶段标签与颜色。</span>
                </Card>
                <Card size="small" type="inner" title="业务编号" extra={<Button type="link" size="small" onClick={() => navigate('/system/number')}>前往 ›</Button>}>
                  <span style={{ color: '#888' }}>配置客户/线索/合同/商机等自动编号的前缀与格式。</span>
                </Card>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  )
}
