import { useEffect, useState } from 'react'
import { App, Button, Card, Form, Space } from 'antd'
import { ProFormCheckbox, ProFormDigit, ProFormTextArea, ProForm } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { getStorefrontConfig, updateStorefrontConfig } from '../../../services/storefront'
import type { StorefrontConfigPayload } from '../../../types/storefront'

/** 站点语言候选(与商品翻译 LocaleFields 的 en/zh 一致,en-US 为可选美式英语) */
const LOCALE_OPTIONS = [
  { label: '英文(en)', value: 'en' },
  { label: '中文(zh)', value: 'zh' },
  { label: '英文(美)(en-US)', value: 'en-US' },
]

/** 折算汇率表单项(货币 → 基准汇率) */
const RATE_CURRENCIES: { key: string; label: string }[] = [
  { key: 'USD', label: 'USD(美元)' },
  { key: 'EUR', label: 'EUR(欧元)' },
  { key: 'GBP', label: 'GBP(英镑)' },
]

interface ConfigFormValues {
  locales: string[]
  rates: Record<string, number | null>
  notify_email?: string
}

export default function StorefrontConfigPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<ConfigFormValues>()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getStorefrontConfig()
      .then((cfg) => {
        form.setFieldsValue({
          locales: cfg.locales ?? [],
          rates: cfg.rates ?? {},
          notify_email: cfg.notify_email ?? '',
        })
      })
      .catch(() => {
        // 配置接口异常不阻塞页面,表单留空可重新保存
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (values: ConfigFormValues) => {
    setLoading(true)
    try {
      const rates: Record<string, number> = {}
      RATE_CURRENCIES.forEach(({ key }) => {
        const v = values.rates?.[key]
        if (v != null) rates[key] = v
      })
      const payload: StorefrontConfigPayload = {
        locales: values.locales ?? [],
        rates,
        // 空串=清除(PUT 空串语义), 提交前 trim 掉首尾空白
        notify_email: (values.notify_email ?? '').trim(),
      }
      await updateStorefrontConfig(payload)
      message.success('独立站配置已保存')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card title="独立站配置">
        <ProForm<ConfigFormValues>
          form={form}
          grid
          onFinish={handleSave}
          submitter={{
            render: () => (
              <Auth perm="storefront:config:save">
                <Button type="primary" loading={loading} onClick={() => form.submit()}>
                  保存站点配置
                </Button>
              </Auth>
            ),
          }}
        >
          <ProFormCheckbox.Group
            name="locales"
            label="站点语言"
            tooltip="独立站开放的语言,商品翻译按此提示补齐;至少保留 en"
            options={LOCALE_OPTIONS}
            rules={[{ required: true, message: '请选择站点语言' }]}
            colProps={{ span: 24 }}
          />
          {RATE_CURRENCIES.map(({ key, label }) => (
            <ProFormDigit
              key={key}
              name={['rates', key]}
              label={`${label} 汇率`}
              tooltip="商品未设直标价时按 CRM 价 × 汇率折算成该币种"
              min={0}
              fieldProps={{ precision: 6, step: 0.0001 }}
              colProps={{ span: 8 }}
            />
          ))}
          <ProFormTextArea
            name="notify_email"
            label="订单/询盘邮件通知收件人"
            tooltip="独立站订单与询盘的邮件通知收件人,多个用英文逗号分隔,如 ops@example.com,sales@example.com;留空表示关闭邮件通知"
            placeholder="ops@example.com,sales@example.com"
            fieldProps={{ rows: 2, allowClear: true }}
            colProps={{ span: 24 }}
          />
        </ProForm>
      </Card>
    </Space>
  )
}
