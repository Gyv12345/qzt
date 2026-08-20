import { useRef, useState } from 'react'
import { App, Button, Modal, Form, InputNumber, Input, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deletePerformance, listPerformances, reviewPerformance, selfReviewPerformance } from '../../../services/hrm'
import { PERF_STATUS, type HrmPerformance } from '../../../types/hrm'
import PerfEditModal from './EditModal'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function PerformancePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [selfReviewTarget, setSelfReviewTarget] = useState<HrmPerformance | null>(null)
  const [reviewTarget, setReviewTarget] = useState<HrmPerformance | null>(null)
  const [selfForm] = Form.useForm()
  const [reviewForm] = Form.useForm()

  const handleSelfReview = async () => {
    if (!selfReviewTarget) return
    const v = await selfForm.validateFields()
    await selfReviewPerformance(selfReviewTarget.id, v.self_score, v.self_comment || '')
    message.success('自评已提交')
    setSelfReviewTarget(null)
    actionRef.current?.reload()
  }

  const handleReview = async () => {
    if (!reviewTarget) return
    const v = await reviewForm.validateFields()
    await reviewPerformance(reviewTarget.id, v)
    message.success('评审已完成')
    setReviewTarget(null)
    actionRef.current?.reload()
  }

  const handleDelete = async (id: number) => {
    await deletePerformance(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<HrmPerformance>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '考核编号', dataIndex: 'perf_no', width: 140 },
    { title: '标题', dataIndex: 'title', width: 180, ellipsis: true },
    { title: '员工', dataIndex: 'employee_name', width: 100 },
    { title: '周期', dataIndex: 'period', width: 90, search: false },
    { title: '自评', dataIndex: 'self_score', width: 70, search: false },
    { title: '上级', dataIndex: 'review_score', width: 70, search: false },
    { title: '最终', dataIndex: 'final_score', width: 70, search: false, render: (_, r) => r.final_score !== '0' ? <strong>{r.final_score}</strong> : '-' },
    { title: '等级', dataIndex: 'grade', width: 60, search: false, render: (_, r) => r.grade ? <Tag color={r.grade==='A'?'success':r.grade==='D'?'error':'default'}>{r.grade}</Tag> : '-' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      valueType: 'select',
      valueEnum: Object.fromEntries(Object.entries(PERF_STATUS).map(([k, v]) => [k, { text: v.text }])),
      render: (_, r) => { const s = PERF_STATUS[r.status] || PERF_STATUS[1]; return <Tag color={s.color}>{s.text}</Tag> },
    },
    {
      title: '操作', valueType: 'option', width: 200, fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 2 && (
            <Button type="link" size="small" onClick={() => { setSelfReviewTarget(record); selfForm.setFieldsValue({ self_score: 0 }) }}>自评</Button>
          )}
          {(record.status === 3 || record.status === 4) && (
            <Auth perm="hrm:performance:review">
              <Button type="link" size="small" onClick={() => { setReviewTarget(record); reviewForm.setFieldsValue({ final_score: Number(record.self_score), review_score: 0 }) }}>评审</Button>
            </Auth>
          )}
          <Auth perm="hrm:performance:add">
            <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<HrmPerformance>
        rowKey="id" actionRef={actionRef} columns={columns} scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listPerformances({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="hrm:performance:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditOpen(true)}>新建考核</Button>
          </Auth>,
        ]}
        headerTitle="绩效考核"
      />
      <PerfEditModal open={editOpen} onOpenChange={setEditOpen} onSuccess={() => actionRef.current?.reload()} />

      <Modal title={`自评 - ${selfReviewTarget?.title || ''}`} open={!!selfReviewTarget} onOk={handleSelfReview} onCancel={() => setSelfReviewTarget(null)} destroyOnHidden>
        <Form form={selfForm} layout="vertical">
          <Form.Item name="self_score" label="自评得分(0-100)" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} precision={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="self_comment" label="自评说明">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={`上级评审 - ${reviewTarget?.title || ''}`} open={!!reviewTarget} onOk={handleReview} onCancel={() => setReviewTarget(null)} destroyOnHidden>
        <Form form={reviewForm} layout="vertical">
          {reviewTarget && <div style={{ marginBottom: 16, color: '#666' }}>自评得分: {reviewTarget.self_score}</div>}
          <Form.Item name="review_score" label="上级评分(0-100)" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} precision={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="final_score" label="最终得分" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} precision={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="grade" label="等级" rules={[{ required: true }]}>
            <Input placeholder="A/B/C/D" />
          </Form.Item>
          <Form.Item name="review_comment" label="评审意见">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
