import { useEffect, useState } from 'react'
import { App, Button, Empty, Form, Input, Select, Space, Switch, Tag } from 'antd'
import Auth from '../../../components/Auth'
import { listCustomFields, updateCustomField } from '../../../services/crm'
import type { CrmCustomField } from '../../../types/crm'
import { FIELD_META, OPTION_TYPES, optionsToText, textToOptions } from './fieldMeta'

export interface PropFormValues {
  name: string
  internal_key?: string
  placeholder?: string
  description?: string
  mobile: boolean
  readable: boolean
  editable: boolean
  showLabel: boolean
  fieldWidth: number
  optionsText?: string
  propRaw?: string
  convertTargetField?: string
}

interface PropEditorProps {
  field?: CrmCustomField
  /** 当前表单 key(LEAD 时展示转化映射) */
  formKey: string
  onSaved: () => void
}

/** 右栏:选中字段的属性编辑(名称/标识/选项配置/开关组) */
export default function PropEditor({ field, formKey, onSaved }: PropEditorProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<PropFormValues>()
  const [saving, setSaving] = useState(false)
  // 线索模块需要客户字段定义作为「转化映射」下拉选项
  const [customerFields, setCustomerFields] = useState<CrmCustomField[]>([])

  useEffect(() => {
    if (formKey !== 'LEAD') return
    listCustomFields('CUSTOMER')
      .then(setCustomerFields)
      .catch(() => {})
  }, [formKey])

  // 跟随选中字段回填
  useEffect(() => {
    if (!field) {
      form.resetFields()
      return
    }
    form.setFieldsValue({
      name: field.name,
      internal_key: field.internal_key || undefined,
      mobile: field.mobile === 1,
      readable: field.readable === 1,
      editable: field.editable === 1,
      showLabel: true,
      fieldWidth: 0.5,
      optionsText: OPTION_TYPES.has(field.type) ? optionsToText(field.prop) : '',
      propRaw: !OPTION_TYPES.has(field.type) ? field.prop || '' : '',
      convertTargetField: field.convert_target_field || undefined,
    })
  }, [field, form])

  const handleSave = async () => {
    if (!field) return
    const values = await form.validateFields()
    setSaving(true)
    try {
      let prop: string | undefined
      if (OPTION_TYPES.has(field.type)) {
        prop = textToOptions(values.optionsText || '') || undefined
      } else {
        prop = values.propRaw || undefined
      }
      await updateCustomField(field.id, {
        name: values.name,
        internal_key: values.internal_key || undefined,
        type: field.type,
        prop,
        mobile: values.mobile ? 1 : 0,
        pos: field.pos,
        convert_target_field: values.convertTargetField || undefined,
      })
      message.success('属性已保存')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: 16,
        maxHeight: '72vh',
        overflowY: 'auto',
        border: '1px solid #f0f0f0',
      }}
    >
      <strong style={{ display: 'block', marginBottom: 12 }}>
        属性编辑
      </strong>
      {!field ? (
        <Empty description="请从左侧添加字段或点击中间字段编辑属性" style={{ marginTop: 60 }} />
      ) : (
        <Form<PropFormValues> form={form} layout="vertical" requiredMark={false}>
          <Form.Item label="字段类型">
            <Tag color="blue">{FIELD_META[field.type]?.label || field.type}</Tag>
          </Form.Item>
          <Form.Item name="name" label="字段名称" rules={[{ required: true, message: '请输入字段名称' }]}>
            <Input placeholder="字段名称" />
          </Form.Item>
          <Form.Item name="internal_key" label="内部标识">
            <Input placeholder="英文字段名,留空自动生成" />
          </Form.Item>
          {formKey === 'LEAD' && (
            <Form.Item
              name="convertTargetField"
              label="转化为客户时映射到"
              tooltip="线索转化客户时,该字段的值会自动带入所选的客户自定义字段;不选则不映射"
            >
              <Select
                options={customerFields.map((f) => ({ label: f.name, value: f.id }))}
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="不映射"
              />
            </Form.Item>
          )}
          <Form.Item name="placeholder" label="占位提示">
            <Input placeholder="输入框占位文字" />
          </Form.Item>
          <Form.Item name="description" label="字段说明">
            <Input.TextArea rows={2} placeholder="字段帮助文字" />
          </Form.Item>
          <Form.Item name="fieldWidth" label="宽度">
            <Select
              options={[
                { label: '半行', value: 0.5 },
                { label: '整行', value: 1 },
              ]}
            />
          </Form.Item>

          {/* 开关组 */}
          <Space wrap size={[12, 8]} style={{ marginBottom: 16 }}>
            <Form.Item name="mobile" label="移动端" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch size="small" />
            </Form.Item>
            <Form.Item name="readable" label="可见" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch size="small" />
            </Form.Item>
            <Form.Item name="editable" label="可编辑" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch size="small" />
            </Form.Item>
            <Form.Item name="showLabel" label="显示标签" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch size="small" />
            </Form.Item>
          </Space>

          {/* 选项编辑器(仅选项类) */}
          {OPTION_TYPES.has(field.type) && (
            <Form.Item
              name="optionsText"
              label="选项配置"
              tooltip="每行一个选项,格式:值|标签(标签可省略)"
            >
              <Input.TextArea
                rows={5}
                placeholder={'每行一个选项,格式:值|标签\n例如:\nA|A级客户\nB|B级客户'}
              />
            </Form.Item>
          )}

          {/* 高级 JSON(非选项类的 BLOB 类型) */}
          {!OPTION_TYPES.has(field.type) && (
            <Form.Item name="propRaw" label="高级属性 JSON">
              <Input.TextArea rows={3} placeholder='大属性 JSON,一般无需填写' />
            </Form.Item>
          )}

          <Auth perm="crm:field:edit">
            <Button type="primary" block loading={saving} onClick={handleSave}>
              保存属性
            </Button>
          </Auth>
        </Form>
      )}
    </div>
  )
}
