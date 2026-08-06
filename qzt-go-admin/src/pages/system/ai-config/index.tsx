import { useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Col, Form, Input } from 'antd'
import {
  ProForm,
  ProFormDigit,
  ProFormSwitch,
  ProFormText,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { batchUpdateConfigs, listConfigs } from '../../../services/system'
import type { SysConfig } from '../../../types'

/** AI 配置表单值(均以配置 key 作为字段名,便于直接拼装 batchUpdate payload) */
interface AiConfigFormValues {
  'ai.base_url': string
  'ai.api_key': string
  'ai.model': string
  'ai.temperature': number
  'ai.max_tokens': number
  'ai.enabled': boolean
}

/** 受控密码输入: ProFormText 没有 password 模式下的 visibility toggle,这里用 antd Input.Password */
function PasswordItem() {
  return (
    <Col span={12}>
      <ProForm.Item name="ai.api_key" label="API Key">
        <Input.Password placeholder="sk-..." autoComplete="new-password" />
      </ProForm.Item>
    </Col>
  )
}

export default function AiConfigPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<AiConfigFormValues>()
  const [loading, setLoading] = useState(false)
  /** 原始配置列表,用于回填与 diff */
  const [configs, setConfigs] = useState<SysConfig[]>([])

  const configMap = useMemo(() => {
    const m = new Map<string, SysConfig>()
    configs.forEach((c) => m.set(c.key, c))
    return m
  }, [configs])

  const loadConfig = async () => {
    const list = await listConfigs('ai')
    setConfigs(list)
    const values: Partial<AiConfigFormValues> = {
      'ai.base_url': '',
      'ai.api_key': '',
      'ai.model': '',
      'ai.temperature': 0.7,
      'ai.max_tokens': 2048,
      'ai.enabled': false,
    }
    list.forEach((c) => {
      if (c.key === 'ai.enabled') {
        values[c.key as 'ai.enabled'] = c.value === '1' || c.value === 'true'
      } else if (c.key === 'ai.temperature' || c.key === 'ai.max_tokens') {
        const n = Number(c.value)
        values[c.key as 'ai.temperature' | 'ai.max_tokens'] = Number.isNaN(n) ? undefined : n
      } else {
        ;(values as Record<string, unknown>)[c.key] = c.value
      }
    })
    form.setFieldsValue(values as AiConfigFormValues)
  }

  useEffect(() => {
    loadConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (values: AiConfigFormValues) => {
    setLoading(true)
    try {
      const items = Object.entries(values).map(([key, val]) => {
        // 与原值一致则跳过,减少无谓写入
        const raw = configMap.get(key)?.value
        let serialized: string
        if (key === 'ai.enabled') {
          serialized = val ? '1' : '0'
        } else if (key === 'ai.temperature' || key === 'ai.max_tokens') {
          serialized = String(val ?? '')
        } else {
          serialized = (val as string) ?? ''
        }
        if (raw !== undefined && raw === serialized) return null
        return { key, value: serialized }
      }).filter(Boolean) as { key: string; value: string }[]
      if (items.length === 0) {
        message.info('没有需要保存的修改')
        return
      }
      await batchUpdateConfigs(items)
      message.success('AI 配置已保存')
      await loadConfig()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="AI 连接配置" style={{ maxWidth: 960 }}>
      <ProForm<AiConfigFormValues>
        form={form}
        grid
        onFinish={handleSave}
        submitter={{
          render: () => (
            <Auth perm="system:config:edit">
              <Button type="primary" loading={loading} onClick={() => form.submit()}>
                保存配置
              </Button>
            </Auth>
          ),
        }}
      >
        <ProFormText
          name="ai.base_url"
          label="Base URL"
          placeholder="如 https://api.openai.com/v1"
          colProps={{ span: 12 }}
        />
        <PasswordItem />
        <ProFormText
          name="ai.model"
          label="模型"
          placeholder="如 gpt-4o-mini"
          colProps={{ span: 12 }}
        />
        <ProFormDigit
          name="ai.temperature"
          label="Temperature"
          min={0}
          max={2}
          step={0.1}
          fieldProps={{ precision: 2 }}
          colProps={{ span: 12 }}
        />
        <ProFormDigit
          name="ai.max_tokens"
          label="Max Tokens"
          min={1}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
        <ProFormSwitch
          name="ai.enabled"
          label="启用 AI"
          fieldProps={{ checkedChildren: '启用', unCheckedChildren: '停用' }}
          colProps={{ span: 12 }}
        />
      </ProForm>
    </Card>
  )
}
