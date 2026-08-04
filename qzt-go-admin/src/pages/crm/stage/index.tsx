import { useCallback, useEffect, useState } from 'react'
import { App, Alert, Button, Card, Form, Input, InputNumber, Select, Space, Spin, Tabs } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import Auth from '../../../components/Auth'
import { getStageConfig, updateStageConfig } from '../../../services/crm'
import type { StageDef } from '../../../types/crm'

type BizType = 'OPPORTUNITY' | 'CONTRACT'

/** 表单行, _existing 标记是否为服务端已有阶段(已有行 key 不可改) */
interface StageRow extends StageDef {
  _existing?: boolean
}

interface StageFormValues {
  stages: StageRow[]
}

const COLOR_OPTIONS = ['blue', 'green', 'orange', 'red', 'purple', 'cyan', 'geekblue', 'magenta']

/** antd 预设色对应的前景色,用于色点展示 */
const COLOR_DOT: Record<string, string> = {
  blue: '#1677ff',
  green: '#52c41a',
  orange: '#fa8c16',
  red: '#f5222d',
  purple: '#722ed1',
  cyan: '#13c2c2',
  geekblue: '#2f54eb',
  magenta: '#eb2f96',
}

function StageEditor({ bizType }: { bizType: BizType }) {
  const { message } = App.useApp()
  const [form] = Form.useForm<StageFormValues>()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getStageConfig(bizType)
      const stages: StageRow[] = [...(res.stages ?? [])]
        .sort((a, b) => a.sort - b.sort)
        .map((s) => ({ ...s, _existing: true }))
      form.setFieldsValue({ stages })
    } finally {
      setLoading(false)
    }
  }, [bizType, form])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    const { stages = [] } = await form.validateFields()
    setSaving(true)
    try {
      // 按表单顺序重新编号 sort,并去掉行内标记字段
      const payload: StageDef[] = stages.map((s, i) => ({
        key: s.key,
        label: s.label,
        color: s.color ?? '',
        sort: i,
        probability: s.probability ?? 0,
      }))
      await updateStageConfig(bizType, payload)
      message.success('阶段配置已保存')
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Spin spinning={loading}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="阶段 key 一旦使用不建议修改;已成交/已丢失类收尾阶段请保留。"
      />
      <Form form={form} autoComplete="off">
        <Form.List name="stages">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => {
                const existing = !!form.getFieldValue(['stages', field.name, '_existing'])
                return (
                  <Space
                    key={field.key}
                    align="baseline"
                    style={{ display: 'flex', marginBottom: 8 }}
                    wrap
                  >
                    <Form.Item name={[field.name, '_existing']} hidden initialValue={false}>
                      <Input />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'key']}
                      rules={[{ required: true, message: '请输入阶段KEY' }]}
                    >
                      <Input
                        placeholder="阶段KEY如 PROSPECTING"
                        style={{ width: 200 }}
                        disabled={existing}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'label']}
                      rules={[{ required: true, message: '请输入显示名' }]}
                    >
                      <Input placeholder="显示名" style={{ width: 160 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'color']}>
                      <Select
                        allowClear
                        placeholder="颜色"
                        style={{ width: 120 }}
                        options={COLOR_OPTIONS.map((c) => ({ label: c, value: c }))}
                        optionRender={(option) => (
                          <Space size={8}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: COLOR_DOT[String(option.value)] ?? '#999',
                              }}
                            />
                            {option.label}
                          </Space>
                        )}
                      />
                    </Form.Item>
                    <Form.Item name={[field.name, 'sort']}>
                      <InputNumber style={{ width: 80 }} placeholder="排序" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'probability']}>
                      <InputNumber min={0} max={100} style={{ width: 100 }} placeholder="概率%" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                )
              })}
              <Form.Item>
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => add({ _existing: false })}
                >
                  添加阶段
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
      <Space style={{ marginTop: 8 }}>
        <Auth perm="crm:stage:edit">
          <Button type="primary" loading={saving} onClick={handleSave}>
            保存
          </Button>
        </Auth>
        <Button onClick={load} disabled={loading || saving}>
          重置
        </Button>
      </Space>
    </Spin>
  )
}

export default function StagePage() {
  return (
    <Card>
      <Tabs
        defaultActiveKey="OPPORTUNITY"
        items={[
          {
            key: 'OPPORTUNITY',
            label: '商机阶段',
            children: <StageEditor bizType="OPPORTUNITY" />,
          },
          {
            key: 'CONTRACT',
            label: '合同阶段',
            children: <StageEditor bizType="CONTRACT" />,
          },
        ]}
      />
    </Card>
  )
}
