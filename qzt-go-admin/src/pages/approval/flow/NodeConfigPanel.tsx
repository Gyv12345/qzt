import { useEffect, useMemo, useState } from 'react'
import { Button, Card, DatePicker, Form, Input, InputNumber, Select, Space, Spin } from 'antd'
import dayjs from 'dayjs'
import type { Node } from '@xyflow/react'
import { getFormFields } from '../../../services/approval'
import type { FormField, FormFieldType } from '../../../types/approval'

interface ApprovalNodeData {
  name: string
  nodeType: string
  executeTiming?: string
  approverConfig?: Record<string, unknown>
  conditionConfig?: string
  [key: string]: unknown
}

interface NodeConfigPanelProps {
  node: Node<ApprovalNodeData>
  /** 当前流程的表单类型(条件字段元数据加载用) */
  formType?: string
  /** 表单标识(仅 OA_CUSTOM 按模板取字段) */
  formKey?: string
  onChange: (data: Partial<ApprovalNodeData>) => void
}

// ── 选项常量 ──
const EXECUTE_TIMING_OPTIONS = [
  { label: '创建时(CREATE)', value: 'CREATE' },
  { label: '更新时(UPDATE)', value: 'UPDATE' },
  { label: '删除时(DELETE)', value: 'DELETE' },
]

const APPROVER_TYPE_OPTIONS = [
  { label: '指定成员(MEMBER)', value: 'MEMBER' },
  { label: '角色(ROLE)', value: 'ROLE' },
  { label: '直属上级(SUPERIOR)', value: 'SUPERIOR' },
  { label: '多级上级(MULTIPLE_SUPERIOR)', value: 'MULTIPLE_SUPERIOR' },
  { label: '部门负责人(DEPT_HEAD)', value: 'DEPT_HEAD' },
  { label: '多级部门负责人(MULTIPLE_DEPT_HEAD)', value: 'MULTIPLE_DEPT_HEAD' },
]

const MULTI_MODE_OPTIONS = [
  { label: '会签(全员同意)', value: 'ALL' },
  { label: '或签(任一同意)', value: 'ANY' },
  { label: '依次审批', value: 'SEQUENTIAL' },
]

const EMPTY_ACTION_OPTIONS = [
  { label: '自动通过(AUTO_PASS)', value: 'AUTO_PASS' },
  { label: '转交指定人(ASSIGN_SPECIFIC)', value: 'ASSIGN_SPECIFIC' },
  { label: '转交管理员(ASSIGN_ADMIN)', value: 'ASSIGN_ADMIN' },
]

const SAME_SUBMITTER_OPTIONS = [
  { label: '自动跳过(SKIP)', value: 'SKIP' },
  { label: '允许审批(ALLOW)', value: 'ALLOW' },
]

// ── 条件字段操作符(按字段类型联动,中文) ──
const OPS_BY_TYPE: Record<FormFieldType, { label: string; value: string }[]> = {
  number: [
    { label: '等于', value: 'EQ' },
    { label: '不等于', value: 'NE' },
    { label: '大于', value: 'GT' },
    { label: '大于等于', value: 'GTE' },
    { label: '小于', value: 'LT' },
    { label: '小于等于', value: 'LTE' },
  ],
  date: [
    { label: '等于', value: 'EQ' },
    { label: '晚于', value: 'GT' },
    { label: '早于', value: 'LT' },
  ],
  enum: [
    { label: '等于', value: 'EQ' },
    { label: '不等于', value: 'NE' },
  ],
  string: [
    { label: '等于', value: 'EQ' },
    { label: '不等于', value: 'NE' },
  ],
}

// ── 条件配置解析/序列化 ──
interface ConditionItem {
  field: string
  op: string
  value: string
}
interface ConditionConfig {
  logic: 'AND' | 'OR'
  conditions: ConditionItem[]
}

function parseCondition(json?: string): ConditionConfig {
  if (!json) return { logic: 'AND', conditions: [] }
  try {
    const obj = JSON.parse(json)
    if (Array.isArray(obj)) {
      // 旧格式兼容
      return { logic: 'AND', conditions: obj }
    }
    return { logic: obj.logic || 'AND', conditions: obj.conditions || [] }
  } catch {
    return { logic: 'AND', conditions: [] }
  }
}

function stringifyCondition(cfg: ConditionConfig): string {
  return JSON.stringify(cfg)
}

export default function NodeConfigPanel({ node, formType, formKey, onChange }: NodeConfigPanelProps) {
  const [form] = Form.useForm()
  const data = node.data
  const isApprover = data.nodeType === 'APPROVER'
  const isCondition = data.nodeType === 'CONDITION'
  const isStart = data.nodeType === 'START'

  // 条件字段元数据(仅 CONDITION 节点加载)
  const [fields, setFields] = useState<FormField[]>([])
  const [fieldsLoading, setFieldsLoading] = useState(false)
  useEffect(() => {
    if (!isCondition || !formType) return
    setFieldsLoading(true)
    getFormFields(formType, formKey)
      .then((res) => setFields(res.fields ?? []))
      .finally(() => setFieldsLoading(false))
  }, [isCondition, formType, formKey])

  // key → 字段定义(联动操作符/值输入用)
  const fieldMap = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields])
  // 按 source 分组(固定字段 / 自定义字段)
  const fieldGroups = useMemo(() => {
    const fixed = fields.filter((f) => f.source === 'fixed')
    const custom = fields.filter((f) => f.source === 'custom')
    const groups: { label: string; options: { label: string; value: string }[] }[] = []
    if (fixed.length) {
      groups.push({ label: '固定字段', options: fixed.map((f) => ({ label: f.label, value: f.key })) })
    }
    if (custom.length) {
      groups.push({ label: '自定义字段', options: custom.map((f) => ({ label: f.label, value: f.key })) })
    }
    return groups
  }, [fields])

  // 跟随节点回填
  useEffect(() => {
    const approverConfig = (data.approverConfig ?? {}) as Record<string, unknown>
    form.setFieldsValue({
      name: data.name,
      executeTiming: data.executeTiming || 'CREATE',
      approver_type: approverConfig.approver_type || 'MEMBER',
      multi_approver_mode: approverConfig.multi_approver_mode || 'ANY',
      empty_approver_action: approverConfig.empty_approver_action || 'AUTO_PASS',
      fallback_approver: approverConfig.fallback_approver,
      same_submitter_action: approverConfig.same_submitter_action || 'SKIP',
      approver_list: approverConfig.approver_list || '[]',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id])

  // 通用字段变更
  const onNameChange = (name: string) => onChange({ name })

  // START 字段变更
  const onExecuteTimingChange = (executeTiming: string) => onChange({ executeTiming })

  // APPROVER 字段变更
  const onApproverFieldChange = (field: string, value: unknown) => {
    onChange({
      approverConfig: { ...(data.approverConfig ?? {}), [field]: value },
    })
  }

  // CONDITION 字段变更
  const onConditionChange = (cfg: ConditionConfig) => {
    onChange({ conditionConfig: stringifyCondition(cfg) })
  }

  const condCfg = parseCondition(data.conditionConfig)

  // 条件项更新辅助
  const updateConditionItem = (i: number, patch: Partial<ConditionItem>) => {
    const next = [...condCfg.conditions]
    next[i] = { ...next[i], ...patch }
    onConditionChange({ ...condCfg, conditions: next })
  }
  // 选中字段后,若当前操作符不被新字段类型支持,则重置为 EQ;并清空值
  const onFieldChange = (i: number, fieldKey: string) => {
    const fd = fieldMap.get(fieldKey)
    const allowedOps = fd ? OPS_BY_TYPE[fd.type].map((o) => o.value) : ['EQ']
    const keepOp = allowedOps.includes(condCfg.conditions[i].op) ? condCfg.conditions[i].op : 'EQ'
    updateConditionItem(i, { field: fieldKey, op: keepOp, value: '' })
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 300,
        maxHeight: 'calc(100% - 24px)',
        overflowY: 'auto',
        zIndex: 10,
      }}
    >
      <Card size="small" title="节点属性" styles={{ body: { padding: 16 } }}>
        <Form form={form} layout="vertical" size="small" requiredMark={false}>
          {/* 通用:节点名称 */}
          <Form.Item label="节点名称" name="name" rules={[{ required: true }]}>
            <Input
              value={data.name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="节点名称"
            />
          </Form.Item>

          {/* START:触发时机 */}
          {isStart && (
            <Form.Item label="触发时机" name="executeTiming">
              <Select
                options={EXECUTE_TIMING_OPTIONS}
                onChange={onExecuteTimingChange}
              />
            </Form.Item>
          )}

          {/* APPROVER:审批人配置 */}
          {isApprover && (
            <>
              <Form.Item label="审批人类型" name="approver_type">
                <Select
                  options={APPROVER_TYPE_OPTIONS}
                  onChange={(v) => onApproverFieldChange('approver_type', v)}
                />
              </Form.Item>
              <Form.Item label="多审批人模式" name="multi_approver_mode">
                <Select
                  options={MULTI_MODE_OPTIONS}
                  onChange={(v) => onApproverFieldChange('multi_approver_mode', v)}
                />
              </Form.Item>
              <Form.Item
                label="审批人列表"
                name="approver_list"
                tooltip="MEMBER/ROLE 时填用户/角色 ID 的 JSON 数组,如 [1,2]"
              >
                <Input
                  placeholder='[1, 2]'
                  onChange={(e) => onApproverFieldChange('approver_list', e.target.value)}
                />
              </Form.Item>
              <Form.Item label="空审批人处理" name="empty_approver_action">
                <Select
                  options={EMPTY_ACTION_OPTIONS}
                  onChange={(v) => onApproverFieldChange('empty_approver_action', v)}
                />
              </Form.Item>
              <Form.Item label="兜底审批人ID" name="fallback_approver">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="空审批人转交的用户ID"
                  onChange={(v) => onApproverFieldChange('fallback_approver', v ?? undefined)}
                />
              </Form.Item>
              <Form.Item label="提交人本人" name="same_submitter_action">
                <Select
                  options={SAME_SUBMITTER_OPTIONS}
                  onChange={(v) => onApproverFieldChange('same_submitter_action', v)}
                />
              </Form.Item>
            </>
          )}

          {/* CONDITION:条件配置 */}
          {isCondition && (
            <>
              <Form.Item label="条件关系">
                <Select
                  value={condCfg.logic}
                  options={[
                    { label: '满足所有(AND)', value: 'AND' },
                    { label: '满足任一(OR)', value: 'OR' },
                  ]}
                  onChange={(v) => onConditionChange({ ...condCfg, logic: v })}
                />
              </Form.Item>
              {fieldsLoading && <Spin size="small" style={{ display: 'block', margin: '8px auto' }} />}
              <div style={{ marginBottom: 8 }}>
                {condCfg.conditions.map((c, i) => {
                  const fd = fieldMap.get(c.field)
                  return (
                    <Space key={i} direction="vertical" size={4} style={{ display: 'flex', marginBottom: 8 }}>
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        placeholder="选择字段"
                        value={c.field || undefined}
                        options={fieldGroups}
                        onChange={(v) => onFieldChange(i, v)}
                      />
                      <Space size={4} style={{ display: 'flex' }}>
                        <Select
                          size="small"
                          style={{ width: 90 }}
                          value={c.op}
                          options={fd ? OPS_BY_TYPE[fd.type] : OPS_BY_TYPE.string}
                          onChange={(v) => updateConditionItem(i, { op: v })}
                        />
                        <ConditionValueInput
                          field={fd}
                          value={c.value}
                          onChange={(val) => updateConditionItem(i, { value: val })}
                        />
                        <Button
                          size="small"
                          danger
                          onClick={() => {
                            const next = condCfg.conditions.filter((_, idx) => idx !== i)
                            onConditionChange({ ...condCfg, conditions: next })
                          }}
                        >
                          ×
                        </Button>
                      </Space>
                    </Space>
                  )
                })}
                <Button
                  size="small"
                  type="dashed"
                  block
                  onClick={() =>
                    onConditionChange({
                      ...condCfg,
                      conditions: [...condCfg.conditions, { field: '', op: 'EQ', value: '' }],
                    })
                  }
                >
                  + 添加条件
                </Button>
                {!fieldsLoading && fields.length === 0 && (
                  <div style={{ color: '#999', fontSize: 12, marginTop: 6, textAlign: 'center' }}>
                    该表单暂无可配置的字段
                  </div>
                )}
              </div>
            </>
          )}

          {!isApprover && !isCondition && !isStart && (
            <div style={{ color: '#999', fontSize: 12, textAlign: 'center', padding: 12 }}>
              该节点类型无可配置属性
            </div>
          )}
        </Form>
      </Card>
    </div>
  )
}

// ── 条件值输入(按字段类型联动) ──
function ConditionValueInput({
  field,
  value,
  onChange,
}: {
  field?: FormField
  value: string
  onChange: (val: string) => void
}) {
  // 未选字段时按文本兜底
  if (!field) {
    return (
      <Input size="small" style={{ width: 160 }} placeholder="值" value={value} onChange={(e) => onChange(e.target.value)} />
    )
  }
  switch (field.type) {
    case 'number':
      return (
        <InputNumber
          size="small"
          style={{ width: 160 }}
          placeholder="数值"
          value={value === '' ? null : Number(value)}
          onChange={(v) => onChange(v == null ? '' : String(v))}
        />
      )
    case 'date':
      return (
        <DatePicker
          size="small"
          style={{ width: 160 }}
          value={value ? dayjs(value) : null}
          onChange={(d) => onChange(d ? d.format('YYYY-MM-DD') : '')}
        />
      )
    case 'enum':
      return (
        <Select
          size="small"
          style={{ width: 160 }}
          placeholder="选择值"
          value={value || undefined}
          options={field.options?.map((o) => ({ label: o.label, value: o.value }))}
          onChange={onChange}
        />
      )
    default:
      return (
        <Input size="small" style={{ width: 160 }} placeholder="值" value={value} onChange={(e) => onChange(e.target.value)} />
      )
  }
}
