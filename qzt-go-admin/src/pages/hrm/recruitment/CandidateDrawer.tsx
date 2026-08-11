import { useEffect, useState, useCallback } from 'react'
import { App, Button, Drawer, Popconfirm, Select, Space, Spin, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ModalForm, ProForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { createCandidate, deleteCandidate, listCandidates, updateCandidate } from '../../../services/hrm'
import { CANDIDATE_STATUS, type HrmCandidate } from '../../../types/hrm'

interface CandidateDrawerProps {
  open: boolean
  jobId: number | null
  onOpenChange: (open: boolean) => void
}

export default function CandidateDrawer({ open, jobId, onOpenChange }: CandidateDrawerProps) {
  const { message } = App.useApp()
  const [list, setList] = useState<HrmCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [form] = ProForm.useForm()

  const load = useCallback(() => {
    if (!jobId) return
    setLoading(true)
    listCandidates({ job_id: jobId, page: 1, page_size: 100 }).then((res) => setList(res.list)).finally(() => setLoading(false))
  }, [jobId])

  useEffect(() => { if (open && jobId) load() }, [open, jobId, load])

  const handleStatusChange = async (id: number, status: number) => {
    await updateCandidate(id, { status })
    message.success('状态已更新')
    load()
  }

  const handleDelete = async (id: number) => {
    await deleteCandidate(id)
    message.success('已删除')
    load()
  }

  const handleAdd = async (values: any) => {
    if (!jobId) return
    await createCandidate({ ...values, job_id: jobId })
    message.success('候选人已添加')
    setAddOpen(false)
    form.resetFields()
    load()
    return true
  }

  const columns = [
    { title: '姓名', dataIndex: 'name', width: 80 },
    { title: '电话', dataIndex: 'phone', width: 120 },
    { title: '学历', dataIndex: 'education', width: 70 },
    { title: '经验', dataIndex: 'experience', width: 80 },
    { title: '公司', dataIndex: 'company', width: 120, ellipsis: true },
    { title: '来源', dataIndex: 'source', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (_: unknown, r: HrmCandidate) => {
        const s = CANDIDATE_STATUS[r.status] || CANDIDATE_STATUS[1]
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '操作', width: 160,
      render: (_: unknown, r: HrmCandidate) => (
        <Space>
          <Select
            size="small"
            variant="borderless"
            value={r.status}
            onChange={(v) => handleStatusChange(r.id, v)}
            style={{ width: 100 }}
            options={Object.entries(CANDIDATE_STATUS).map(([k, v]) => ({ label: v.text, value: Number(k) }))}
          />
          <Popconfirm title="删除?" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" size="small" danger>删</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Drawer title="候选人管理" open={open} onClose={() => onOpenChange(false)} width={960} destroyOnHidden
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加候选人</Button>}
    >
      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}><Spin size="large" /></div>
      ) : (
        <Table size="small" rowKey="id" dataSource={list} columns={columns} pagination={{ pageSize: 20 }} scroll={{ x: 'max-content' }} />
      )}
      <ModalForm title="添加候选人" form={form} open={addOpen} onOpenChange={setAddOpen} onFinish={handleAdd} width={560} grid modalProps={{ destroyOnHidden: true }}>
        <ProFormText name="name" label="姓名" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 12 }} />
        <ProFormText name="phone" label="电话" colProps={{ span: 12 }} />
        <ProFormText name="email" label="邮箱" colProps={{ span: 12 }} />
        <ProFormText name="education" label="学历" colProps={{ span: 12 }} />
        <ProFormText name="experience" label="工作年限" colProps={{ span: 12 }} />
        <ProFormText name="company" label="当前公司" colProps={{ span: 12 }} />
        <ProFormText name="source" label="来源" placeholder="如 Boss直聘/内推" colProps={{ span: 24 }} />
        <ProFormTextArea name="remark" label="备注" colProps={{ span: 24 }} />
      </ModalForm>
    </Drawer>
  )
}
