import { useState } from 'react'
import { App, Input, Select } from 'antd'
import { ModalForm, ProForm } from '@ant-design/pro-components'
import { listEnabledLeadPools, releaseLead } from '../../../services/lead'
import type { CrmLead } from '../../../types/lead'

interface ReleaseModalProps {
  /** 目标线索(非空即打开),关闭时置 null */
  target: CrmLead | null
  onClose: () => void
  onSuccess: () => void
}

/** 释放线索到公海弹窗:选择线索池 + 释放原因 */
export default function ReleaseModal({ target, onClose, onSuccess }: ReleaseModalProps) {
  const { message } = App.useApp()
  const [poolOptions, setPoolOptions] = useState<{ label: string; value: number }[]>([])

  const loadPools = async () => {
    const pools = await listEnabledLeadPools()
    setPoolOptions(pools.map((p) => ({ label: p.name, value: p.id })))
  }

  return (
    <ModalForm<{ pool_id: number; reason?: string }>
      title={target ? `释放线索:${target.name}` : '释放线索'}
      open={!!target}
      onOpenChange={(open) => {
        if (!open) onClose()
        else loadPools()
      }}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={async (values) => {
        if (!target) return false
        await releaseLead(target.id, { pool_id: values.pool_id, reason: values.reason })
        message.success('线索已释放到公海')
        onSuccess()
        return true
      }}
      width={420}
    >
      <ProForm.Item
        name="pool_id"
        label="线索池"
        rules={[{ required: true, message: '请选择线索池' }]}
      >
        <Select showSearch optionFilterProp="label" options={poolOptions} placeholder="选择线索池" />
      </ProForm.Item>
      <ProForm.Item name="reason" label="释放原因">
        <Input.TextArea rows={3} placeholder="选填" />
      </ProForm.Item>
    </ModalForm>
  )
}
