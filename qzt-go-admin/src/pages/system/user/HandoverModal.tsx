import { App, Alert } from 'antd'
import { ModalForm, ProForm } from '@ant-design/pro-components'
import UserSelect from '../../../components/UserSelect'
import request from '../../../utils/request'
import type { SysUser } from '../../../types'

interface HandoverModalProps {
  /** 交接来源用户;null 时关闭 */
  target: SysUser | null
  onClose: () => void
}

/** 离职交接:把用户名下的客户/线索/商机/合同/跟进记录全部转移给接收人 */
export default function HandoverModal({ target, onClose }: HandoverModalProps) {
  const { message } = App.useApp()

  return (
    <ModalForm<{ to_user_id: number }>
      title={target ? `离职交接 - ${target.nickname || target.username}` : '离职交接'}
      open={!!target}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={async (values) => {
        if (!target) return false
        const res = await request.post<unknown, any>('/crm/handover', {
          from_user_id: target.id,
          to_user_id: values.to_user_id,
        })
        const r = res || {}
        message.success(
          `交接完成: 客户${r.customer || 0} 线索${r.lead || 0} 商机${r.opportunity || 0} 合同${r.contract || 0} 跟进${r.follow_record || 0}`,
        )
        onClose()
        return true
      }}
      width={480}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message={`将 ${target?.nickname || target?.username} 名下的客户、线索、商机、合同、跟进记录全部转移给接收人`}
      />
      <ProForm.Item name="to_user_id" label="接收人" rules={[{ required: true, message: '请选择接收人' }]}>
        <UserSelect placeholder="选择接收人" />
      </ProForm.Item>
    </ModalForm>
  )
}
