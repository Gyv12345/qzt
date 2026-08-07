import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, InputNumber, Space, Spin, Switch, Tabs, Tag, message } from 'antd'
import Auth from '../../../components/Auth'
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
        setTemplates(tplRes.list || [])
      })
      .finally(() => setLoading(false))
  }, [])

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
                  <span style={{ color: '#888' }}>配置客户/商机/合同/商品/跟进记录的表单字段。</span>
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
