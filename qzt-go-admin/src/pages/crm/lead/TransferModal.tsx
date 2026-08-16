import { App } from 'antd'
import { ModalForm, ProForm } from '@ant-design/pro-components'
import UserSelect from '../../../components/UserSelect'
import { transferLead } from '../../../services/lead'
import type { CrmLead } from '../../../types/lead'

interface TransferModalProps {
  /** 目标线索(非空即打开),关闭时置 null */
  target: CrmLead | null
  onClose: () => void
  onSuccess: () => void
}

/** 转移线索弹窗:选择新负责人 */
export default function TransferModal({ target, onClose, onSuccess }: TransferModalProps) {
  const { message } = App.useApp()

  return (
    <ModalForm<{ to_user_id: number }>
      title={target ? `转移线索:${target.name}` : '转移线索'}
      open={!!target}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={async (values) => {
        if (!target) return false
        await transferLead(target.id, values.to_user_id)
        message.success('线索已转移')
        onSuccess()
        return true
      }}
      width={420}
    >
      <ProForm.Item
        name="to_user_id"
        label="新负责人"
        rules={[{ required: true, message: '请选择新负责人' }]}
      >
        <UserSelect placeholder="选择新负责人" />
      </ProForm.Item>
    </ModalForm>
  )
}
