import { useEffect, useState, useCallback } from 'react'
import { App, Button, Descriptions, Drawer, Form, Input, Modal, Select, Spin, Tag, Timeline } from 'antd'
import { getTicket, changeTicketStatus } from '../../../services/crm'
import { TICKET_STATUS, TICKET_PRIORITY, type TicketDetail } from '../../../types/crm'

interface DetailDrawerProps {
  open: boolean
  ticketId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function TicketDetailDrawer({ open, ticketId, onOpenChange, onSuccess }: DetailDrawerProps) {
  const { message } = App.useApp()
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusModal, setStatusModal] = useState(false)
  const [statusForm] = Form.useForm<{ status: number; solution?: string; comment?: string }>()

  const load = useCallback(() => {
    if (!ticketId) return
    setLoading(true)
    getTicket(ticketId).then(setDetail).finally(() => setLoading(false))
  }, [ticketId])

  useEffect(() => { if (open && ticketId) load() }, [open, ticketId, load])

  const openStatusModal = () => {
    statusForm.resetFields()
    statusForm.setFieldsValue({ status: detail?.ticket.status })
    setStatusModal(true)
  }

  const handleStatusChange = async () => {
    if (!ticketId) return
    const values = await statusForm.validateFields()
    await changeTicketStatus(ticketId, values.status, values.solution, values.comment)
    message.success('状态已更新')
    setStatusModal(false)
    load()
    onSuccess()
  }

  const t = detail?.ticket
  const statusInfo = t ? TICKET_STATUS[t.status] || TICKET_STATUS[1] : TICKET_STATUS[1]

  return (
    <Drawer title="工单详情" open={open} onClose={() => onOpenChange(false)} width={680} destroyOnHidden>
      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>
      ) : detail && t ? (
        <>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="工单号">{t.ticket_no}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={statusInfo.color}>{statusInfo.text}</Tag></Descriptions.Item>
            <Descriptions.Item label="标题" span={2}>{t.title}</Descriptions.Item>
            <Descriptions.Item label="客户">{t.customer_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="联系人">{t.contact_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="电话">{t.contact_phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="优先级"><Tag color={(TICKET_PRIORITY[t.priority] || TICKET_PRIORITY[2]).color}>{(TICKET_PRIORITY[t.priority] || TICKET_PRIORITY[2]).text}</Tag></Descriptions.Item>
            <Descriptions.Item label="类型">{t.category || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{t.created_at}</Descriptions.Item>
            {t.description && <Descriptions.Item label="描述" span={2}>{t.description}</Descriptions.Item>}
            {t.solution && <Descriptions.Item label="解决方案" span={2}>{t.solution}</Descriptions.Item>}
          </Descriptions>

          <div style={{ margin: '16px 0 8px' }}>
            <Button type="primary" onClick={openStatusModal}>处理 / 变更状态</Button>
          </div>

          <h3>处理日志</h3>
          <Timeline
            items={(detail.logs || []).map((log) => ({
              children: (
                <div>
                  <div style={{ fontWeight: 500 }}>{log.content}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {TICKET_STATUS[log.old_status]?.text || '-'} → {TICKET_STATUS[log.new_status]?.text || '-'} · {log.created_at}
                  </div>
                </div>
              ),
            }))}
          />
        </>
      ) : (
        <div style={{ textAlign: 'center', paddingTop: 80, color: '#999' }}>无数据</div>
      )}

      <Modal title="变更状态" open={statusModal} onOk={handleStatusChange} onCancel={() => setStatusModal(false)} destroyOnHidden>
        <Form form={statusForm} layout="vertical">
          <Form.Item name="status" label="目标状态" rules={[{ required: true }]}>
            <Select options={Object.entries(TICKET_STATUS).map(([k, v]) => ({ label: v.text, value: Number(k) }))} />
          </Form.Item>
          <Form.Item name="solution" label="解决方案(解决/关闭时填写)">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="comment" label="处理备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  )
}
