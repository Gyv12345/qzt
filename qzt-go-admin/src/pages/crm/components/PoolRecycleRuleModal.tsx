import { App, Alert, Button, DatePicker, Form, InputNumber, Radio, Select, Space, Switch, Typography } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { ModalForm, ProForm, ProFormDependency } from '@ant-design/pro-components'
import type { Dayjs } from 'dayjs'
import type { CrmPoolRecycleRule, CrmRecycleCondition } from '../../../types/crm'

const { RangePicker } = DatePicker

export interface RecycleConditionFormValue {
  timeField: 'LAST_FOLLOW_TIME' | 'STORAGE_TIME'
  operator: 'DYNAMIC' | 'FIXED'
  days?: number
  range?: [Dayjs, Dayjs] | null
  nullSatisfied?: boolean
}

export interface RecycleRuleFormValues {
  operator: 'AND' | 'OR'
  conditions?: RecycleConditionFormValue[]
}

interface PoolRecycleRuleModalProps {
  open: boolean
  poolId: number
  poolName?: string
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  /** 客户池/线索池各自的保存接口 */
  onSave: (id: number, data: CrmPoolRecycleRule) => Promise<unknown>
}

/** 公海池(客户/线索通用)回收规则表单:AND/OR 条件组(N 天未跟进 / 固定日期区间) */
export default function PoolRecycleRuleModal({
  open,
  poolId,
  poolName,
  onOpenChange,
  onSuccess,
  onSave,
}: PoolRecycleRuleModalProps) {
  const { message } = App.useApp()

  const handleSubmit = async (values: RecycleRuleFormValues) => {
    const conditions: CrmRecycleCondition[] = (values.conditions ?? []).map((c) => ({
      timeField: c.timeField,
      operator: c.operator,
      value:
        c.operator === 'FIXED'
          ? [c.range?.[0], c.range?.[1]].map((d) => d?.format('YYYY-MM-DD') ?? '').join(',')
          : String(c.days ?? 0),
      nullSatisfied: c.nullSatisfied ?? false,
    }))
    await onSave(poolId, {
      operator: values.operator,
      conditions: JSON.stringify(conditions),
    })
    message.success('回收规则已保存')
    onSuccess()
    return true
  }

  return (
    <ModalForm<RecycleRuleFormValues>
      title={`回收规则${poolName ? ` - ${poolName}` : ''}`}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      initialValues={{ operator: 'AND', conditions: [] }}
      onFinish={handleSubmit}
      width={900}
    >
      <Alert
        type="warning"
        showIcon
        message="规则保存后即覆盖,当前已存规则不可回显"
        style={{ marginBottom: 16 }}
      />
      <ProForm.Item name="operator" label="条件关系" rules={[{ required: true, message: '请选择条件关系' }]}>
        <Radio.Group>
          <Radio.Button value="AND">AND 全部满足</Radio.Button>
          <Radio.Button value="OR">OR 任一满足</Radio.Button>
        </Radio.Group>
      </ProForm.Item>
      <ProForm.Item label="回收条件">
        <Form.List name="conditions">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" wrap style={{ display: 'flex', marginBottom: 8 }}>
                  <ProForm.Item
                    name={[field.name, 'timeField']}
                    rules={[{ required: true, message: '请选择时间字段' }]}
                  >
                    <Select
                      style={{ width: 160 }}
                      placeholder="时间字段"
                      options={[
                        { label: '最近跟进时间', value: 'LAST_FOLLOW_TIME' },
                        { label: '领取入库时间', value: 'STORAGE_TIME' },
                      ]}
                    />
                  </ProForm.Item>
                  <ProForm.Item
                    name={[field.name, 'operator']}
                    rules={[{ required: true, message: '请选择条件类型' }]}
                  >
                    <Select
                      style={{ width: 160 }}
                      placeholder="条件类型"
                      options={[
                        { label: 'N 天未跟进', value: 'DYNAMIC' },
                        { label: '固定日期区间', value: 'FIXED' },
                      ]}
                    />
                  </ProForm.Item>
                  <ProFormDependency name={['conditions']}>
                    {(values) => {
                      const cond = values?.conditions?.[field.name]
                      return cond?.operator === 'FIXED' ? (
                        <ProForm.Item
                          name={[field.name, 'range']}
                          rules={[{ required: true, message: '请选择日期区间' }]}
                        >
                          <RangePicker />
                        </ProForm.Item>
                      ) : (
                        <ProForm.Item
                          name={[field.name, 'days']}
                          rules={[{ required: true, message: '请输入天数' }]}
                        >
                          <InputNumber min={1} precision={0} placeholder="天数" style={{ width: 100 }} />
                        </ProForm.Item>
                      )
                    }}
                  </ProFormDependency>
                  <Space size={4}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      为空也算满足
                    </Typography.Text>
                    <ProForm.Item name={[field.name, 'nullSatisfied']} valuePropName="checked" noStyle>
                      <Switch size="small" />
                    </ProForm.Item>
                  </Space>
                  <MinusCircleOutlined onClick={() => remove(field.name)} />
                </Space>
              ))}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() =>
                  add({
                    timeField: 'LAST_FOLLOW_TIME',
                    operator: 'DYNAMIC',
                    days: 30,
                    nullSatisfied: false,
                  })
                }
              >
                添加条件
              </Button>
            </>
          )}
        </Form.List>
      </ProForm.Item>
    </ModalForm>
  )
}
