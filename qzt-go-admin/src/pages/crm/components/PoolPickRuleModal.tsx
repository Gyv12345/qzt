import { App, Alert, InputNumber, Switch } from 'antd'
import { ModalForm, ProForm } from '@ant-design/pro-components'
import type { CrmPoolPickRule } from '../../../types/crm'

export interface PickRuleFormValues {
  limit_daily: boolean
  daily_limit?: number
  limit_prev_owner: boolean
  prev_owner_interval?: number
  limit_new_data: boolean
  new_data_interval?: number
}

interface PoolPickRuleModalProps {
  open: boolean
  poolId: number
  poolName?: string
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  /** 客户池/线索池各自的保存接口 */
  onSave: (id: number, data: CrmPoolPickRule) => Promise<unknown>
}

/** 公海池(客户/线索通用)领取规则表单:每日上限/前归属人冷却/新数据冷却 */
export default function PoolPickRuleModal({
  open,
  poolId,
  poolName,
  onOpenChange,
  onSuccess,
  onSave,
}: PoolPickRuleModalProps) {
  const { message } = App.useApp()

  const handleSubmit = async (values: PickRuleFormValues) => {
    await onSave(poolId, {
      limit_daily: values.limit_daily ? 1 : 0,
      daily_limit: values.daily_limit ?? 0,
      limit_prev_owner: values.limit_prev_owner ? 1 : 0,
      prev_owner_interval: values.prev_owner_interval ?? 0,
      limit_new_data: values.limit_new_data ? 1 : 0,
      new_data_interval: values.new_data_interval ?? 0,
    })
    message.success('领取规则已保存')
    onSuccess()
    return true
  }

  return (
    <ModalForm<PickRuleFormValues>
      title={`领取规则${poolName ? ` - ${poolName}` : ''}`}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      initialValues={{
        limit_daily: false,
        daily_limit: 0,
        limit_prev_owner: false,
        prev_owner_interval: 0,
        limit_new_data: false,
        new_data_interval: 0,
      }}
      onFinish={handleSubmit}
      width={480}
    >
      <Alert
        type="warning"
        showIcon
        message="规则保存后即覆盖,当前已存规则不可回显"
        style={{ marginBottom: 16 }}
      />
      <ProForm.Item name="limit_daily" label="限制每日领取" valuePropName="checked">
        <Switch checkedChildren="限制" unCheckedChildren="不限" />
      </ProForm.Item>
      <ProForm.Item name="daily_limit" label="每日领取上限">
        <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="每人每日最多领取数" />
      </ProForm.Item>
      <ProForm.Item name="limit_prev_owner" label="限制前归属人" valuePropName="checked">
        <Switch checkedChildren="限制" unCheckedChildren="不限" />
      </ProForm.Item>
      <ProForm.Item name="prev_owner_interval" label="前归属人冷却天数">
        <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="原负责人多少天内不可领回" />
      </ProForm.Item>
      <ProForm.Item name="limit_new_data" label="限制新数据" valuePropName="checked">
        <Switch checkedChildren="限制" unCheckedChildren="不限" />
      </ProForm.Item>
      <ProForm.Item name="new_data_interval" label="新数据冷却天数">
        <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="入库多少天内不可领取" />
      </ProForm.Item>
    </ModalForm>
  )
}
