import { App, Alert, Space, Tag } from 'antd'
import { ModalForm, ProForm } from '@ant-design/pro-components'
import UserSelect from '../../../components/UserSelect'
import request from '../../../utils/request'
import type { SysUser } from '../../../types'

interface HandoverModalProps {
  /** 交接来源用户;null 时关闭 */
  target: SysUser | null
  onClose: () => void
}

/** 离职交接:把用户名下的客户/线索/商机/合同/跟进/协作/工单、项目/任务、待办审批、云盘文件、资产、仓库全部转移给接收人 */
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
          `交接完成: 客户${r.customer || 0} 线索${r.lead || 0} 商机${r.opportunity || 0} 合同${r.contract || 0} 跟进${r.follow_record || 0} 协作${r.collaboration || 0} 工单${r.ticket || 0} 项目${r.project || 0} 任务${r.task || 0} 待办审批${r.approval_task || 0} 云盘文件${r.cloud_file || 0} 资产${r.asset || 0} 仓库${r.warehouse || 0}`,
        )
        onClose()
        return true
      }}
      width={520}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="将转移以下业务内容给接收人"
        description={
          <Space direction="vertical" size={2}>
            <div>
              <Tag color="blue">CRM</Tag>客户、线索、商机、合同、跟进记录/计划、客户协作、工单、合同模板
            </div>
            <div>
              <Tag color="green">项目</Tag>负责的项目、执行的任务
            </div>
            <div>
              <Tag color="orange">审批</Tag>未办结的待办审批任务(已办结记录保留原审批人)
            </div>
            <div>
              <Tag color="purple">云盘/资产</Tag>云盘文件、名下资产(使用人)、负责的仓库
            </div>
            <div style={{ color: '#888', fontSize: 12 }}>
              个人日程/工作日志/报销等本人记录、部门负责人与直属上级、知识库文档不转移
            </div>
          </Space>
        }
      />
      <ProForm.Item name="to_user_id" label="接收人" rules={[{ required: true, message: '请选择接收人' }]}>
        <UserSelect placeholder="选择接收人" />
      </ProForm.Item>
    </ModalForm>
  )
}
