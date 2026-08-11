import { useEffect, useState } from 'react'
import { App, Button, Drawer, Space, Switch, Tag } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import Auth from './Auth'
import {
  getFlowByFormType,
  setApprovalFlowEnable,
} from '../services/approval'
import type { ApprovalFlow } from '../types/approval'
import Designer from '../pages/approval/flow/Designer'

interface ApprovalFlowSetupProps {
  /** 表单类型，如 CONTRACT / EXPENSE / TRIP */
  formType: string
  /** 模块中文名，如「合同审批」「报销审批」 */
  label: string
  /** 表单标识（仅 OA_CUSTOM：每个表单模板一条独立审批流） */
  formKey?: string
}

/**
 * 审批流配置面板（可复用）。
 * 嵌入各业务模块页面，用 form_type 获取对应的预置审批流，
 * 提供启用/禁用开关 + 设计流程入口。
 */
export default function ApprovalFlowSetup({ formType, label, formKey }: ApprovalFlowSetupProps) {
  const { message } = App.useApp()
  const [flow, setFlow] = useState<ApprovalFlow | null>(null)
  const [loading, setLoading] = useState(false)
  const [designId, setDesignId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getFlowByFormType(formType, formKey)
      setFlow(data)
    } catch {
      // 拦截器已提示
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formType, formKey])

  const handleToggle = async (checked: boolean) => {
    if (!flow) return
    try {
      await setApprovalFlowEnable(flow.id, checked ? 1 : 0)
      message.success(checked ? '审批流已启用' : '审批流已禁用')
      await load()
    } catch {
      // 拦截器已提示
    }
  }

  const hasDesign = flow?.current_version_id != null
  const isEnabled = flow?.enable === 1

  return (
    <>
      <Space size="middle" align="center">
        <span style={{ fontSize: 13, color: '#8c8c8c' }}>{label}</span>
        {isEnabled ? (
          <Tag color="success">已启用</Tag>
        ) : (
          <Tag>未启用</Tag>
        )}
        {!hasDesign && isEnabled && (
          <Tag color="warning">未设计节点</Tag>
        )}
        <Auth perm="approval:flow:enable">
          <Switch
            checked={isEnabled}
            loading={loading}
            onChange={handleToggle}
            size="small"
          />
        </Auth>
        <Auth perm="approval:flow:design">
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => flow && setDesignId(flow.id)}
          >
            设计流程
          </Button>
        </Auth>
      </Space>

      <Drawer
        title={null}
        open={designId !== null}
        onClose={() => {
          setDesignId(null)
          load()
        }}
        width="90%"
        styles={{ body: { padding: 0, height: '100%' } }}
        destroyOnHidden
      >
        {designId !== null && (
          <Designer
            flowId={designId}
            onClose={() => {
              setDesignId(null)
              load()
            }}
          />
        )}
      </Drawer>
    </>
  )
}
