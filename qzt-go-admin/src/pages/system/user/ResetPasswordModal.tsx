import { App, Alert } from 'antd'
import { ModalForm, ProFormText } from '@ant-design/pro-components'
import { resetUserPassword } from '../../../services/system'
import type { SysUser } from '../../../types'

interface ResetPasswordModalProps {
  target: SysUser | null
  onClose: () => void
}

/** 管理员重置用户密码(无需旧密码;重置后该用户所有登录会话失效,登录失败锁定一并解除) */
export default function ResetPasswordModal({ target, onClose }: ResetPasswordModalProps) {
  const { message } = App.useApp()

  const handleSubmit = async (values: { password: string }) => {
    if (!target) return false
    await resetUserPassword(target.id, values)
    message.success(`已重置 ${target.nickname || target.username} 的密码`)
    onClose()
    return true
  }

  return (
    <ModalForm<{ password: string }>
      title={`重置密码 - ${target?.nickname || target?.username || ''}`}
      open={!!target}
      onFinish={handleSubmit}
      modalProps={{ destroyOnHidden: true, maskClosable: false, onCancel: onClose }}
      width={440}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="重置后该用户所有登录会话将失效,需用新密码重新登录;其登录失败锁定也会一并解除。"
      />
      <ProFormText.Password
        name="password"
        label="新密码"
        rules={[
          { required: true, message: '请输入新密码' },
          { min: 6, message: '密码至少 6 位' },
          { max: 72, message: '密码最多 72 位' },
        ]}
        placeholder="至少 6 位,请线下告知该用户"
      />
    </ModalForm>
  )
}
