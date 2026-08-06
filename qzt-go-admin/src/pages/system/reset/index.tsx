import { useState } from 'react'
import { App, Alert, Button, Card, Input, Popconfirm, Space, Typography } from 'antd'
import request from '../../../utils/request'

export default function ResetPage() {
  const { message, modal } = App.useApp()
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const confirmed = value.trim() === 'RESET'

  const handleReset = async () => {
    setLoading(true)
    try {
      await request.post('/system/reset', { confirm: 'RESET' })
      message.success('业务数据已清理')
      setValue('')
      modal.success({
        title: '业务数据已清理',
        content: '请刷新页面以重新加载业务数据。',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="数据重置" style={{ maxWidth: 720 }}>
      <Alert
        type="error"
        showIcon
        message="危险操作"
        description={
          <Space direction="vertical" size={4}>
            <Typography.Text>
              此操作将清空所有业务数据(客户/线索/商机/合同/跟进/员工/凭证/进销存单据等),系统配置(用户/角色/菜单/字典/审批流程定义/部门/岗位)不受影响。
            </Typography.Text>
            <Typography.Text strong style={{ color: '#cf1322' }}>
              此操作不可逆!
            </Typography.Text>
          </Space>
        }
        style={{ marginBottom: 24 }}
      />
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Typography.Text>
            请在下方输入框中输入 <Typography.Text strong>RESET</Typography.Text> 以激活清理按钮:
          </Typography.Text>
        </div>
        <Input
          placeholder="请输入 RESET"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ maxWidth: 320 }}
          allowClear
        />
        <Popconfirm
          title="确认清理业务数据?"
          description="此操作将清空所有业务数据且不可逆,确定继续?"
          okText="确认清理"
          okButtonProps={{ danger: true }}
          cancelText="取消"
          disabled={!confirmed}
          onConfirm={handleReset}
        >
          <Button type="primary" danger disabled={!confirmed} loading={loading}>
            一键清理业务数据
          </Button>
        </Popconfirm>
      </Space>
    </Card>
  )
}
