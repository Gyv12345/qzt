import { useEffect, useMemo, useRef, useState } from 'react'
import { App, Alert, Button, Card, Checkbox, Input, Space, Typography } from 'antd'
import request from '../../../utils/request'
import { useAuthStore } from '../../../stores/auth'

// 数据重置高危操作的三重确认:
// ① 逐项勾选知悉后果 → ② 输入 RESET 激活按钮 → ③ 二次弹窗 5 秒倒计时防手滑。
// 后端仍会独立校验超管身份与 confirm 值,前端拦截只是第一道提示。

export default function ResetPage() {
  const { message, modal } = App.useApp()
  const profile = useAuthStore((s) => s.profile)
  const [value, setValue] = useState('')
  const [checkedList, setCheckedList] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const confirmModalRef = useRef<ReturnType<(typeof modal)['confirm']> | null>(null)

  const isSuperAdmin = useMemo(
    () => !!profile?.roles?.some((r) => r.code === 'super_admin'),
    [profile],
  )

  const confirmItems = useMemo(
    () => [
      { key: 'irreversible', label: '我已知晓此操作不可逆,清理后数据无法恢复' },
      { key: 'oss', label: '我已知晓业务附件文件将从 OSS/本地存储永久删除(含文章图片、简历)' },
      { key: 'scope', label: '我已确认清理范围(知识库/云盘/资产保留,其余业务数据全部清空)' },
    ],
    [],
  )

  const allChecked = checkedList.length === confirmItems.length
  const confirmed = allChecked && value.trim() === 'RESET'

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [countdown > 0])

  // 命令式弹窗的按钮文案/禁用态不会跟随 state,需在倒计时变化时手动同步
  useEffect(() => {
    confirmModalRef.current?.update({
      okText: countdown > 0 ? `仍要清理 (${countdown}s)` : '确认永久清理',
      okButtonProps: { danger: true, disabled: countdown > 0 },
    })
  }, [countdown])

  const handleReset = async () => {
    setLoading(true)
    try {
      await request.post('/system/reset', { confirm: 'RESET' })
      message.success('业务数据已清理')
      setValue('')
      setCheckedList([])
      modal.success({
        title: '业务数据已清理',
        content: '请刷新页面以重新加载业务数据。',
      })
    } finally {
      setLoading(false)
    }
  }

  const openConfirmModal = () => {
    setCountdown(5)
    confirmModalRef.current = modal.confirm({
      title: '确认永久清理所有业务数据?',
      content: (
        <Space direction="vertical" size={4} style={{ marginTop: 8 }}>
          <Typography.Text strong style={{ color: '#cf1322' }}>
            所有业务数据及其附件文件将被永久删除,包括:
          </Typography.Text>
          <Typography.Text>· CRM(客户/线索/商机/合同/跟进/工单)与项目任务</Typography.Text>
          <Typography.Text>· 员工/考勤/薪酬/绩效/候选人、审批实例</Typography.Text>
          <Typography.Text>· 凭证/发票/应收、进销存单据</Typography.Text>
          <Typography.Text>· 官网文章/页面、报销/差旅/借款/日程/消息/公告</Typography.Text>
          <Typography.Text>· 全部业务附件文件(OSS 永久删除)与操作日志</Typography.Text>
          <Typography.Text strong style={{ color: '#cf1322' }}>
            此操作不可逆,删除的文件无法找回!
          </Typography.Text>
        </Space>
      ),
      okText: '仍要清理 (5s)',
      okButtonProps: { danger: true, disabled: true },
      cancelText: '取消',
      onOk: handleReset,
      onCancel: () => {
        setCountdown(0)
        confirmModalRef.current = null
      },
    })
  }

  return (
    <Card title="数据重置" style={{ maxWidth: 760 }}>
      <Alert
        type="error"
        showIcon
        message="危险操作 —— 仅超级管理员可执行"
        description={
          <Space direction="vertical" size={4}>
            <Typography.Text>
              此操作将清空所有业务数据(CRM 客户/线索/商机/合同/跟进/工单、项目任务、审批实例、员工/考勤/薪酬/绩效/候选人、凭证/发票/应收、进销存单据、官网文章/页面、报销/差旅/借款/日程/工作日志/表单数据/会议室预订/消息/公告),并从
              OSS/本地存储永久删除业务附件文件(含文章图片、简历),同时清空附件与操作日志。
            </Typography.Text>
            <Typography.Text>
              系统配置(用户/角色/菜单/字典/审批流程定义/部门/岗位/供应商/仓库/产品/财务账户)与知识库、云盘、资产不受影响。
            </Typography.Text>
            <Typography.Text strong style={{ color: '#cf1322' }}>
              此操作不可逆!删除的数据与文件无法恢复!
            </Typography.Text>
          </Space>
        }
        style={{ marginBottom: 24 }}
      />

      {!isSuperAdmin ? (
        <Alert
          type="warning"
          showIcon
          message="无权执行"
          description="数据重置仅超级管理员可执行,当前账号不具备超管身份。"
        />
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>第一步:逐项确认知悉以下后果</Typography.Text>
            <Checkbox.Group
              style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}
              options={confirmItems.map((i) => ({ value: i.key, label: i.label }))}
              value={checkedList}
              onChange={(vals) => setCheckedList(vals as string[])}
            />
          </div>
          <div>
            <Typography.Text strong>
              第二步:在下方输入框中输入 <Typography.Text code>RESET</Typography.Text>{' '}
              以激活清理按钮:
            </Typography.Text>
            <Input
              placeholder="请输入 RESET"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{ maxWidth: 320, marginTop: 12 }}
              allowClear
              disabled={!allChecked}
            />
          </div>
          <div>
            <Typography.Text strong>第三步:点击按钮并再次确认</Typography.Text>
            <div style={{ marginTop: 12 }}>
              <Button
                type="primary"
                danger
                size="large"
                disabled={!confirmed}
                loading={loading}
                onClick={openConfirmModal}
              >
                一键清理业务数据
              </Button>
            </div>
          </div>
        </Space>
      )}
    </Card>
  )
}
