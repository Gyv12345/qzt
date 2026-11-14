import { useEffect, useState } from 'react'
import { App, Button, Card, Collapse, Descriptions, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import {
  getCustomerTianyancha,
} from '../../../services/crm'
import { getTianyanchaConfig } from '../../../services/system'
import type { TianyanchaConfig } from '../../../types'
import type { CrmTianyanchaInfo } from '../../../types/crm'

/** 天眼查未配置时的引导文案(与配置页入口一致) */
const NOT_CONFIGURED_TIP = '请联系管理员在 系统管理→第三方应用 配置天眼查 MCP'

interface TianyanchaSectionProps {
  customerId: number
  /** 查询用企业名称(客户名称) */
  companyName: string
  open: boolean
}

/** 客户详情「天眼查」区块:工商信息结构化展示 + 写入跟进记录 + 原始 JSON 折叠 */
export default function TianyanchaSection({ customerId, companyName, open }: TianyanchaSectionProps) {
  const { message } = App.useApp()
  const [config, setConfig] = useState<TianyanchaConfig | null>(null)
  const [querying, setQuerying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [info, setInfo] = useState<CrmTianyanchaInfo | null>(null)

  const loadConfig = async () => {
    try {
      setConfig(await getTianyanchaConfig())
    } catch {
      // 配置读取失败不阻塞详情展示,点击查询时由后端报错兜底
      setConfig(null)
    }
  }

  useEffect(() => {
    if (!open) {
      setInfo(null)
      setConfig(null)
      return
    }
    loadConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const notConfigured = Boolean(config && !config.configured)
  const remaining = config?.configured
    ? Math.max((config.daily_limit || 0) - (config.today_used || 0), 0)
    : null

  const handleQuery = async () => {
    if (notConfigured) {
      message.warning(NOT_CONFIGURED_TIP)
      return
    }
    setQuerying(true)
    try {
      const r = await getCustomerTianyancha(customerId, companyName)
      setInfo(r)
      loadConfig() // 刷新今日已用额度
    } catch {
      // 「天眼查未配置」「今日查询已达上限」等文案由拦截器透传
    } finally {
      setQuerying(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await getCustomerTianyancha(customerId, companyName, true)
      message.success('已写入跟进记录')
      loadConfig()
    } catch {
      // 报错文案由拦截器透传
    } finally {
      setSaving(false)
    }
  }

  const field = (v: string | number | undefined | null) =>
    v === undefined || v === null || v === '' ? '-' : String(v)

  return (
    <div style={{ marginBottom: 16 }}>
      <Space wrap align="center">
        <Button icon={<SearchOutlined />} loading={querying} onClick={handleQuery}>
          天眼查查询
        </Button>
        <span style={{ fontSize: 12, color: '#999' }}>
          {notConfigured
            ? '未配置'
            : remaining !== null
              ? `今日剩余 ${remaining} 次`
              : ''}
        </span>
      </Space>

      {info && (
        <Card
          size="small"
          title={`天眼查工商信息:${field(info.company_name)}`}
          style={{ marginTop: 12 }}
          extra={
            <Button size="small" type="primary" loading={saving} onClick={handleSave}>
              写入跟进记录
            </Button>
          }
        >
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="法定代表人">{field(info.legal_person)}</Descriptions.Item>
            <Descriptions.Item label="经营状态">{field(info.status)}</Descriptions.Item>
            <Descriptions.Item label="注册资本">{field(info.registered_capital)}</Descriptions.Item>
            <Descriptions.Item label="成立日期">{field(info.establish_date)}</Descriptions.Item>
            <Descriptions.Item label="统一社会信用代码">
              {field(info.credit_code)}
            </Descriptions.Item>
            <Descriptions.Item label="参保人数">{field(info.insured_count)}</Descriptions.Item>
            <Descriptions.Item label="注册地址" span={2}>
              {field(info.address)}
            </Descriptions.Item>
          </Descriptions>
          <Collapse
            ghost
            size="small"
            style={{ marginTop: 8 }}
            items={[
              {
                key: 'raw',
                label: '原始数据(JSON)',
                children: (
                  <pre
                    style={{
                      margin: 0,
                      maxHeight: 300,
                      overflow: 'auto',
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {JSON.stringify(info.raw ?? info, null, 2)}
                  </pre>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  )
}
