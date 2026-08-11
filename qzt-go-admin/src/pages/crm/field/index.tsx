import { useEffect, useState } from 'react'
import {
  App,
  Button,
  Col,
  Empty,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import Auth from '../../../components/Auth'
import {
  createCustomField,
  deleteCustomField,
  listCustomFields,
  updateCustomField,
} from '../../../services/crm'
import {
  CRM_FORM_KEYS,
  type CrmCustomField,
} from '../../../types/crm'
import CustomFieldItem from '../customer/CustomFields'

const { Text } = Typography

/** 字段类型 → 中文名 + 图标 */
const FIELD_META: Record<string, { label: string; icon: string }> = {
  INPUT: { label: '单行文本', icon: '📝' },
  TEXTAREA: { label: '多行文本', icon: '📄' },
  INPUT_NUMBER: { label: '数字', icon: '🔢' },
  DATE_TIME: { label: '日期时间', icon: '📅' },
  RADIO: { label: '单选框', icon: '🔘' },
  CHECKBOX: { label: '多选框', icon: '☑️' },
  SELECT: { label: '下拉单选', icon: '📋' },
  SELECT_MULTIPLE: { label: '下拉多选', icon: '📑' },
  INPUT_MULTIPLE: { label: '标签输入', icon: '🏷️' },
  MEMBER: { label: '人员(单选)', icon: '👤' },
  MEMBER_MULTIPLE: { label: '人员(多选)', icon: '👥' },
  DEPARTMENT: { label: '部门(单选)', icon: '🏢' },
  DEPARTMENT_MULTIPLE: { label: '部门(多选)', icon: '🏬' },
  PICTURE: { label: '图片', icon: '🖼️' },
  ATTACHMENT: { label: '附件', icon: '📎' },
  LOCATION: { label: '地区', icon: '📍' },
  PHONE: { label: '电话', icon: '📞' },
  LINK: { label: '超链接', icon: '🔗' },
  INDUSTRY: { label: '行业', icon: '🏭' },
  FORMULA: { label: '公式', icon: 'ƒ' },
  SERIAL_NUMBER: { label: '自动编号', icon: '🔢' },
  DATA_SOURCE: { label: '关联记录(单选)', icon: '🔗' },
  DATA_SOURCE_MULTIPLE: { label: '关联记录(多选)', icon: '🔗' },
  SUB_PRODUCT: { label: '产品明细', icon: '📦' },
  SUB_PRICE: { label: '报价明细', icon: '💰' },
  DIVIDER: { label: '分隔线', icon: '➖' },
}

/** 分组 */
const GROUPS: { title: string; types: string[] }[] = [
  {
    title: '常用',
    types: [
      'INPUT', 'TEXTAREA', 'INPUT_NUMBER', 'DATE_TIME',
      'RADIO', 'CHECKBOX', 'SELECT', 'SELECT_MULTIPLE', 'INPUT_MULTIPLE',
    ],
  },
  {
    title: '人员组织',
    types: ['MEMBER', 'MEMBER_MULTIPLE', 'DEPARTMENT', 'DEPARTMENT_MULTIPLE'],
  },
  {
    title: '高级',
    types: [
      'PICTURE', 'ATTACHMENT', 'LOCATION', 'PHONE', 'LINK', 'INDUSTRY',
      'FORMULA', 'SERIAL_NUMBER', 'DATA_SOURCE', 'DATA_SOURCE_MULTIPLE',
      'SUB_PRODUCT', 'SUB_PRICE', 'DIVIDER',
    ],
  },
]

/** 需要选项配置的类型 */
const OPTION_TYPES = new Set(['RADIO', 'CHECKBOX', 'SELECT', 'SELECT_MULTIPLE'])

/** prop 中解析/序列化选项 */
function optionsToText(prop?: string): string {
  if (!prop) return ''
  try {
    const obj = JSON.parse(prop)
    const arr = obj.options ?? obj
    if (!Array.isArray(arr)) return ''
    return arr
      .map((o: { label?: string; value?: string }) => {
        const v = String(o.value ?? '')
        const l = String(o.label ?? '')
        return v && v !== l ? `${v}|${l}` : l
      })
      .join('\n')
  } catch {
    return ''
  }
}

function textToOptions(text: string): string {
  const options = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.indexOf('|')
      if (sep > 0) {
        return { value: line.slice(0, sep).trim(), label: line.slice(sep + 1).trim() }
      }
      return { value: line, label: line }
    })
  return options.length ? JSON.stringify({ options }) : ''
}

interface PropFormValues {
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

export default function CrmFieldPage() {
  const { message } = App.useApp()
  const [currentKey, setCurrentKey] = useState<string>(CRM_FORM_KEYS[0].value)
  const [fields, setFields] = useState<CrmCustomField[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customerFields, setCustomerFields] = useState<CrmCustomField[]>([])
  const [propForm] = Form.useForm<PropFormValues>()

  const selectedField = fields.find((f) => f.id === selectedId)
  const currentLabel = CRM_FORM_KEYS.find((f) => f.value === currentKey)?.label ?? currentKey

  const loadFields = async () => {
    setLoading(true)
    try {
      const data = await listCustomFields(currentKey)
      setFields(data.sort((a, b) => a.pos - b.pos))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFields()
    setSelectedId(undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey])

  // 线索模块需要客户字段定义作为「转化映射」下拉选项
  useEffect(() => {
    if (currentKey !== 'LEAD') return
    listCustomFields('CUSTOMER')
      .then(setCustomerFields)
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey])

  // 右栏跟随选中字段回填
  useEffect(() => {
    if (!selectedField) {
      propForm.resetFields()
      return
    }
    propForm.setFieldsValue({
      name: selectedField.name,
      internal_key: selectedField.internal_key || undefined,
      mobile: selectedField.mobile === 1,
      readable: selectedField.readable === 1,
      editable: selectedField.editable === 1,
      showLabel: true,
      fieldWidth: 0.5,
      optionsText: OPTION_TYPES.has(selectedField.type) ? optionsToText(selectedField.prop) : '',
      propRaw: !OPTION_TYPES.has(selectedField.type) ? selectedField.prop || '' : '',
      convertTargetField: selectedField.convert_target_field || undefined,
    })
  }, [selectedField, propForm])

  // 左栏点击类型 → 新增字段
  const handleAdd = async (type: string) => {
    const maxPos = fields.reduce((mx, f) => Math.max(mx, f.pos), 0)
    try {
      await createCustomField({
        form_key: currentKey,
        name: FIELD_META[type]?.label || '新字段',
        type,
        pos: maxPos + 10,
      })
      message.success('字段已添加')
      await loadFields()
      // 选中新增的(最后一个)
      const data = await listCustomFields(currentKey)
      const sorted = data.sort((a, b) => a.pos - b.pos)
      setSelectedId(sorted[sorted.length - 1]?.id)
    } catch {
      // 拦截器已提示
    }
  }

  // 右栏保存属性
  const handleSaveProp = async () => {
    if (!selectedField) return
    const values = await propForm.validateFields()
    setSaving(true)
    try {
      let prop: string | undefined
      if (OPTION_TYPES.has(selectedField.type)) {
        prop = textToOptions(values.optionsText || '') || undefined
      } else {
        prop = values.propRaw || undefined
      }
      await updateCustomField(selectedField.id, {
        name: values.name,
        internal_key: values.internal_key || undefined,
        type: selectedField.type,
        prop,
        mobile: values.mobile ? 1 : 0,
        pos: selectedField.pos,
        convert_target_field: values.convertTargetField || undefined,
      })
      message.success('属性已保存')
      await loadFields()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteCustomField(id)
    message.success('字段已删除')
    if (selectedId === id) setSelectedId(undefined)
    await loadFields()
  }

  // 上移/下移:交换相邻字段的 pos
  const handleMove = async (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= fields.length) return
    const a = fields[idx]
    const b = fields[target]
    await Promise.all([
      updateCustomField(a.id, { name: a.name, type: a.type, pos: b.pos, mobile: a.mobile }),
      updateCustomField(b.id, { name: b.name, type: b.type, pos: a.pos, mobile: b.mobile }),
    ])
    await loadFields()
  }

  return (
    <div style={{ padding: 0 }}>
      <style>{`
        .field-preview-item .field-actions { opacity: 0; transition: opacity .15s; }
        .field-preview-item:hover .field-actions,
        .field-preview-item.is-selected .field-actions { opacity: 1; }
        .field-type-tile { transition: all .15s; }
        .field-type-tile:hover { border-color: #1677ff !important; color: #1677ff !important; background: #e6f4ff !important; }
      `}</style>

      <Tabs
        activeKey={currentKey}
        onChange={setCurrentKey}
        items={CRM_FORM_KEYS.map((f) => ({ key: f.value, label: f.label }))}
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        {/* 左栏:字段类型面板 */}
        <Col span={6}>
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
            <Text strong style={{ display: 'block', marginBottom: 12 }}>
              字段类型
            </Text>
            {GROUPS.map((g) => (
              <div key={g.title} style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  {g.title}
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {g.types.map((t) => (
                    <div
                      key={t}
                      className="field-type-tile"
                      onClick={() => handleAdd(t)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 10px',
                        border: '1px solid #f0f0f0',
                        borderRadius: 6,
                        cursor: loading ? 'wait' : 'pointer',
                        fontSize: 13,
                        background: '#fafafa',
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{FIELD_META[t]?.icon || '▫'}</span>
                      <span>{FIELD_META[t]?.label || t}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Col>

        {/* 中栏:表单预览 */}
        <Col span={11}>
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              minHeight: '72vh',
              border: '1px solid #f0f0f0',
            }}
          >
            <Text strong style={{ display: 'block', marginBottom: 12 }}>
              {currentLabel}表单预览
            </Text>
            {fields.length === 0 ? (
              <Empty description="点击左侧字段类型添加字段" style={{ marginTop: 100 }} />
            ) : (
              <Row gutter={[12, 12]}>
                {fields.map((f, idx) => {
                  const selected = selectedId === f.id
                  return (
                    <Col
                      span={f.type === 'DIVIDER' ? 24 : 12}
                      key={f.id}
                    >
                      <div
                        className={`field-preview-item${selected ? ' is-selected' : ''}`}
                        onClick={() => setSelectedId(f.id)}
                        style={{
                          position: 'relative',
                          padding: '12px 12px 4px',
                          border: selected ? '1px solid #1677ff' : '1px solid transparent',
                          background: selected ? '#e6f4ff' : '#fafafa',
                          borderRadius: 6,
                          cursor: 'pointer',
                          minHeight: 48,
                          transition: 'border-color .15s',
                        }}
                      >
                        {/* 操作按钮 */}
                        <div
                          className="field-actions"
                          style={{
                            position: 'absolute',
                            top: -10,
                            right: 6,
                            display: 'flex',
                            gap: 4,
                            zIndex: 2,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="small"
                            icon={<ArrowUpOutlined />}
                            disabled={idx <= 0}
                            onClick={() => handleMove(idx, 'up')}
                          />
                          <Button
                            size="small"
                            icon={<ArrowDownOutlined />}
                            disabled={idx >= fields.length - 1}
                            onClick={() => handleMove(idx, 'down')}
                          />
                          <Auth perm="crm:field:delete">
                            <Popconfirm
                              title="删除后已录入的该字段数据将不可见,确认删除?"
                              okText="删除"
                              okButtonProps={{ danger: true }}
                              cancelText="取消"
                              onConfirm={() => handleDelete(f.id)}
                            >
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Auth>
                        </div>
                        {/* 字段名 + 类型 */}
                        <div style={{ marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</span>
                          <Tag style={{ marginLeft: 8, fontSize: 11 }}>
                            {FIELD_META[f.type]?.label || f.type}
                          </Tag>
                        </div>
                        {/* 预览控件 */}
                        <CustomFieldItem field={f} />
                      </div>
                    </Col>
                  )
                })}
              </Row>
            )}
          </div>
        </Col>

        {/* 右栏:属性编辑 */}
        <Col span={7}>
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
            <Text strong style={{ display: 'block', marginBottom: 12 }}>
              属性编辑
            </Text>
            {!selectedField ? (
              <Empty description="请从左侧添加字段或点击中间字段编辑属性" style={{ marginTop: 60 }} />
            ) : (
              <Form<PropFormValues>
                form={propForm}
                layout="vertical"
                requiredMark={false}
              >
                <Form.Item label="字段类型">
                  <Tag color="blue">{FIELD_META[selectedField.type]?.label || selectedField.type}</Tag>
                </Form.Item>
                <Form.Item
                  name="name"
                  label="字段名称"
                  rules={[{ required: true, message: '请输入字段名称' }]}
                >
                  <Input placeholder="字段名称" />
                </Form.Item>
                <Form.Item name="internal_key" label="内部标识">
                  <Input placeholder="英文字段名,留空自动生成" />
                </Form.Item>
                {currentKey === 'LEAD' && (
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
                {OPTION_TYPES.has(selectedField.type) && (
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
                {!OPTION_TYPES.has(selectedField.type) && (
                  <Form.Item name="propRaw" label="高级属性 JSON">
                    <Input.TextArea
                      rows={3}
                      placeholder='大属性 JSON,一般无需填写'
                    />
                  </Form.Item>
                )}

                <Auth perm="crm:field:edit">
                  <Button
                    type="primary"
                    block
                    loading={saving}
                    onClick={handleSaveProp}
                  >
                    保存属性
                  </Button>
                </Auth>
              </Form>
            )}
          </div>
        </Col>
      </Row>
    </div>
  )
}
