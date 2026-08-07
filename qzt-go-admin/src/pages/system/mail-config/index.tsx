import { useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Col, Form, Input, Select } from 'antd'
import {
  ProForm,
  ProFormDigit,
  ProFormSwitch,
  ProFormText,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { testMailConnect } from '../../../services/mail'
import { batchUpdateConfigs, listConfigs } from '../../../services/system'
import type { SysConfig } from '../../../types'

/** SMTP 配置表单值(字段名即配置 key,便于直接拼装 batchUpdate payload) */
interface MailConfigFormValues {
  'mail.enabled': boolean
  'mail.host': string
  'mail.port': number
  'mail.username': string
  'mail.password': string
  'mail.from': string
  'mail.from_name': string
  'mail.encryption': string
}

const ENCRYPTION_OPTIONS = [
  { label: 'SSL(隐式 SSL,默认 465 端口)', value: 'ssl' },
  { label: 'TLS(STARTTLS,通常 587 端口)', value: 'tls' },
  { label: '无(明文,不推荐)', value: 'none' },
]

/** 受控密码输入: ProFormText 没有 password 模式下的 visibility toggle,这里用 antd Input.Password */
function PasswordItem() {
  return (
    <Col span={12}>
      <ProForm.Item name="mail.password" label="SMTP 授权码/密码">
        <Input.Password placeholder="邮箱服务商生成的授权码" autoComplete="new-password" />
      </ProForm.Item>
    </Col>
  )
}

export default function MailConfigPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<MailConfigFormValues>()
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  /** 原始配置列表,用于回填与 diff */
  const [configs, setConfigs] = useState<SysConfig[]>([])

  const configMap = useMemo(() => {
    const m = new Map<string, SysConfig>()
    configs.forEach((c) => m.set(c.key, c))
    return m
  }, [configs])

  const loadConfig = async () => {
    const list = await listConfigs('mail')
    setConfigs(list)
    const values: Partial<MailConfigFormValues> = {
      'mail.enabled': false,
      'mail.host': '',
      'mail.port': 465,
      'mail.username': '',
      'mail.password': '',
      'mail.from': '',
      'mail.from_name': 'qzt 系统',
      'mail.encryption': 'ssl',
    }
    list.forEach((c) => {
      if (c.key === 'mail.enabled') {
        values[c.key as 'mail.enabled'] = c.value === '1' || c.value === 'true'
      } else if (c.key === 'mail.port') {
        const n = Number(c.value)
        values[c.key as 'mail.port'] = Number.isNaN(n) ? 465 : n
      } else {
        ;(values as Record<string, unknown>)[c.key] = c.value
      }
    })
    form.setFieldsValue(values as MailConfigFormValues)
  }

  useEffect(() => {
    loadConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (values: MailConfigFormValues) => {
    setLoading(true)
    try {
      const items = Object.entries(values).map(([key, val]) => {
        const raw = configMap.get(key)?.value
        let serialized: string
        if (key === 'mail.enabled') {
          serialized = val ? '1' : '0'
        } else if (key === 'mail.port') {
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
      message.success('邮件配置已保存')
      await loadConfig()
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      // 先保存当前表单,再测试
      await form.validateFields()
      const values = form.getFieldsValue()
      await handleSave(values)
      const res = await testMailConnect()
      message.success(res?.msg || '测试邮件已发送,请到收件箱确认')
    } catch {
      // service 层已弹 error
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card title="邮件 SMTP 配置" style={{ maxWidth: 960 }}>
      <ProForm<MailConfigFormValues>
        form={form}
        grid
        onFinish={handleSave}
        submitter={{
          render: () => (
            <>
              <Auth perm="system:config:edit">
                <Button type="primary" loading={loading} onClick={() => form.submit()}>
                  保存配置
                </Button>
              </Auth>
              <Auth perm="system:config:edit">
                <Button loading={testing} onClick={handleTest} style={{ marginLeft: 8 }}>
                  发送测试邮件
                </Button>
              </Auth>
            </>
          ),
        }}
      >
        <ProFormSwitch
          name="mail.enabled"
          label="启用邮件"
          fieldProps={{ checkedChildren: '启用', unCheckedChildren: '停用' }}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="mail.host"
          label="SMTP 服务器"
          placeholder="如 smtp.exmail.qq.com"
          colProps={{ span: 12 }}
        />
        <ProFormDigit
          name="mail.port"
          label="端口"
          min={1}
          max={65535}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="mail.username"
          label="发信账号"
          placeholder="SMTP 登录用户名(通常即发件邮箱)"
          colProps={{ span: 12 }}
        />
        <PasswordItem />
        <ProFormText
          name="mail.from"
          label="发件人地址"
          placeholder="发件人邮箱(留空则用发信账号)"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="mail.from_name"
          label="发件人名称"
          placeholder="收件人看到的发件人显示名"
          colProps={{ span: 12 }}
        />
        <Col span={12}>
          <ProForm.Item name="mail.encryption" label="加密方式">
            <Select options={ENCRYPTION_OPTIONS} placeholder="选择加密方式" />
          </ProForm.Item>
        </Col>
      </ProForm>
    </Card>
  )
}
