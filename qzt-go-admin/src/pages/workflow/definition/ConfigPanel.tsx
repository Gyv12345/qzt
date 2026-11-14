// ConfigPanel.tsx 工作流节点配置面板(P27):按节点类型出动态表单。
import { useEffect, useState } from 'react'
import {
  Button,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
} from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { Node } from '@xyflow/react'
import { ACTION_OPTIONS, type WFNodeData } from './canvasMeta'

interface ConfigPanelProps {
  open: boolean
  node: Node<WFNodeData> | null
  onSave: (name: string, config: Record<string, unknown>) => void
  onClose: () => void
}

// 白名单常量(与后端 fieldUpdateWhitelist 对齐)。
const FIELD_WHITELIST: Record<string, string[]> = {
  crm_lead: ['status'],
  crm_customer: ['level', 'status'],
}

// op 选项(与后端 evalCond 支持一致)。
const OP_OPTIONS = [
  { value: 'EQ', label: '等于' },
  { value: 'NE', label: '不等于' },
  { value: 'GT', label: '大于' },
  { value: 'GE', label: '≥' },
  { value: 'LT', label: '小于' },
  { value: 'LE', label: '≤' },
  { value: 'CONTAINS', label: '包含' },
  { value: 'EMPTY', label: '为空' },
  { value: 'NOT_EMPTY', label: '非空' },
]

// ConfigPanel 节点配置面板(Drawer)。
export default function ConfigPanel({ open, node, onSave, onClose }: ConfigPanelProps) {
  const [form] = Form.useForm()
  const [action, setAction] = useState<string>('notify')
  const [nodeType, setNodeType] = useState<string>('ACTION')

  useEffect(() => {
    if (open && node) {
      const d = node.data as WFNodeData
      setNodeType(d.nodeType)
      setAction(String((d.config as { action?: string }).action || 'notify'))
      form.setFieldsValue({
        name: d.name,
        ...d.config,
      })
    }
    if (!open) {
      form.resetFields()
    }
  }, [open, node, form])

  // handleSave 提交面板配置回父组件。
  const handleSave = () => {
    form.validateFields().then((values) => {
      const d = node?.data as WFNodeData | undefined
      let config: Record<string, unknown> = { ...values }
      delete config.name
      if (d?.nodeType === 'ACTION') config.action = action
      if (d?.nodeType === 'TRIGGER') config = {}
      onSave(d?.name ?? '', config)
      onClose()
    })
  }

  return (
    <Drawer
      title="节点配置"
      width={420}
      open={open}
      mask={false}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSave}>保存</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="节点名称" rules={[{ required: true }]}>
          <Input placeholder="节点名称" />
        </Form.Item>

        {nodeType === 'ACTION' && (
          <>
            <Form.Item label="动作类型">
              <Select
                value={action}
                onChange={(v) => {
                  setAction(v)
                  // 切换动作类型时重置为该类型的默认模板
                  const meta = ACTION_OPTIONS.find((o) => o.action === v)
                  if (meta) form.setFieldsValue({ ...meta.defaultConfig })
                }}
                options={ACTION_OPTIONS.map((o) => ({ value: o.action, label: o.label }))}
              />
            </Form.Item>

            {action === 'notify' && (
              <>
                <Form.Item name="receiver" label="接收人用户ID(支持模板 {{payload.xxx}})" rules={[{ required: true }]}>
                  <Input placeholder="{{payload.owner_id}} 或具体数字ID" />
                </Form.Item>
                <Form.Item name="title" label="通知标题" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="content" label="通知内容(支持模板)" rules={[{ required: true }]}>
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item name="path" label="跳转路径(可选)">
                  <Input placeholder="/customer" />
                </Form.Item>
              </>
            )}

            {action === 'field_update' && (
              <>
                <Form.Item name="table" label="目标表" rules={[{ required: true }]}>
                  <Select options={[{ value: 'crm_lead', label: '线索 crm_lead' }, { value: 'crm_customer', label: '客户 crm_customer' }]} />
                </Form.Item>
                <Form.Item name="where_field" label="定位字段" initialValue="id">
                  <Input disabled />
                </Form.Item>
                <Form.Item name="where_value" label="定位值(支持模板)" rules={[{ required: true }]}>
                  <Input placeholder="{{payload.lead_id}}" />
</Form.Item>
                <Form.Item name="field" label="目标字段" rules={[{ required: true }]}>
                  <Select options={(FIELD_WHITELIST[
                    (form.getFieldValue('table') as string) || 'crm_lead'
                  ] ?? []).map((f) => ({ value: f, label: f }))} />
                </Form.Item>
                <Form.Item name="value" label="字段值(支持模板)" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </>
            )}

            {action === 'http' && (
              <>
                <Form.Item name="url" label="请求 URL" rules={[{ required: true }]}>
                  <Input placeholder="https://" />
                </Form.Item>
                <Form.Item name="method" label="方法" initialValue="POST">
                  <Select options={[{ value: 'GET' }, { value: 'POST' }]} />
                </Form.Item>
                <Form.Item name="body" label="请求体(对象或 JSON 字符串,支持模板)">
                  <Input.TextArea rows={4} />
                </Form.Item>
                <Form.Item name="sign_secret" label="HMAC 签名密钥(可选)">
                  <Input.Password />
                </Form.Item>
              </>
            )}

            {action === 'llm' && (
              <>
                <Form.Item name="prompt" label="Prompt(支持模板)" rules={[{ required: true }]}>
                  <Input.TextArea rows={5} placeholder={'新线索:{{payload.name}}(来源{{payload.source}}),写一句跟进建议'} />
                </Form.Item>
                <Form.Item name="max_tokens" label="Max Tokens" initialValue={500}>
                  <InputNumber min={50} max={4000} style={{ width: '100%' }} />
                </Form.Item>
              </>
            )}
          </>
        )}

        {nodeType === 'CONDITION' && (
          <>
            <Divider>分支列表(按连线先后对应,最后一条连线=兜底)</Divider>
            <Form.List name="branches">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field) => (
                    <div key={field.key} style={{ border: '1px solid #eee', padding: 12, marginBottom: 12, borderRadius: 8 }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Form.Item name={[field.name, 'label']} noStyle>
                          <Input placeholder={`分支 ${field.name + 1} 名称`} style={{ width: 200 }} />
                        </Form.Item>
                        <Popconfirm title="删除该分支?" onConfirm={() => remove(field.name)}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                      <Form.Item name={[field.name, 'logic']} label="条件组合" initialValue="AND">
                        <Select options={[{ value: 'AND', label: '且(AND)' }, { value: 'OR', label: '或(OR)' }]} />
                      </Form.Item>
                      <Form.List name={[field.name, 'conditions']}>
                        {(conds, { add: addC, remove: removeC }) => (
                          <>
                            {conds.map((cond) => (
                              <Space key={cond.key} style={{ display: 'flex' }} align="baseline">
                                <Form.Item name={[cond.name, 'left']} noStyle>
                                  <Input placeholder="左值 {{payload.total_amount}}" style={{ width: 150 }} />
                                </Form.Item>
                                <Form.Item name={[cond.name, 'op']} noStyle>
                                  <Select style={{ width: 90 }} options={OP_OPTIONS} />
                                </Form.Item>
                                <Form.Item name={[cond.name, 'right']} noStyle>
                                  <Input placeholder="右值(可模板)" style={{ width: 150 }} />
                                </Form.Item>
                                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeC(cond.name)} />
                              </Space>
                            ))}
                            <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => addC()}>
                              加条件
                            </Button>
                          </>
                        )}
                      </Form.List>
                    </div>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ label: '', logic: 'AND', conditions: [] })}>
                    加分支
                  </Button>
                </>
              )}
            </Form.List>
          </>
        )}
      </Form>
    </Drawer>
  )
}
