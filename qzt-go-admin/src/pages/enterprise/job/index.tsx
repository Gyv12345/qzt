import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Form, Popconfirm, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { createJob, deleteJob, listJobs, runJob, updateJob } from '../../../services/enterprise'
import type { EntJob } from '../../../types/enterprise'
import { pageIndexColumn } from '../../../components/IndexTag'

interface JobFormValues {
  job_name: string
  bean_class: string
  cron_expression: string
  job_group?: string
  status: number
  remark?: string
}

export default function JobPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<JobFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EntJob | null>(null)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 1 })
    setModalOpen(true)
  }

  const openEdit = (record: EntJob) => {
    setEditing(record)
    form.setFieldsValue({
      job_name: record.job_name,
      bean_class: record.bean_class,
      cron_expression: record.cron_expression,
      job_group: record.job_group,
      status: record.status,
      remark: record.remark,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: JobFormValues) => {
    const payload = {
      job_name: values.job_name,
      bean_class: values.bean_class,
      cron_expression: values.cron_expression,
      job_group: values.job_group || undefined,
      status: values.status,
      remark: values.remark || undefined,
    }
    if (editing) {
      await updateJob(editing.id, payload)
      message.success('任务已更新')
    } else {
      await createJob(payload)
      message.success('任务已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleRun = async (record: EntJob) => {
    await runJob(record.id)
    message.success('任务已触发')
    actionRef.current?.reload()
  }

  const handleDelete = async (record: EntJob) => {
    await deleteJob(record.id)
    message.success('任务已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<EntJob>[] = [
    pageIndexColumn(actionRef),
    { title: '任务名', dataIndex: 'job_name', width: 180 },
    { title: '处理器', dataIndex: 'bean_class', width: 200, search: false },
    { title: 'Cron 表达式', dataIndex: 'cron_expression', width: 140, search: false },
    { title: '分组', dataIndex: 'job_group', width: 120, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      search: false,
      valueEnum: {
        1: { text: '启用', status: 'Success' },
        0: { text: '停用', status: 'Default' },
      },
    },
    { title: '备注', dataIndex: 'remark', width: 200, ellipsis: true, search: false },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="enterprise:job:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="enterprise:job:run">
            <Popconfirm
              title="确认手动触发该任务?"
              okText="触发"
              cancelText="取消"
              onConfirm={() => handleRun(record)}
            >
              <Button type="link" size="small">
                手动触发
              </Button>
            </Popconfirm>
          </Auth>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/enterprise/job-log?job_id=${record.id}`)}
          >
            日志
          </Button>
          <Auth perm="enterprise:job:delete">
            <Popconfirm
              title="确认删除该任务?"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<EntJob>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listJobs({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="enterprise:job:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增任务
            </Button>
          </Auth>,
        ]}
        headerTitle="定时任务"
      />
      <ModalForm<JobFormValues>
        title={editing ? '编辑任务' : '新增任务'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <ProFormText
          name="job_name"
          label="任务名"
          rules={[{ required: true, message: '请输入任务名' }]}
          placeholder="如 每日数据同步"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="bean_class"
          label="处理器"
          rules={[{ required: true, message: '请输入处理器 Bean 名' }]}
          placeholder="后端注册的处理器 Bean 名"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="cron_expression"
          label="Cron 表达式"
          rules={[{ required: true, message: '请输入 Cron 表达式' }]}
          placeholder="如 0 0 2 * * ?"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="job_group"
          label="分组"
          placeholder="如 DEFAULT"
          colProps={{ span: 12 }}
        />
        <ProFormRadio.Group
          name="status"
          label="状态"
          rules={[{ required: true, message: '请选择状态' }]}
          options={[
            { label: '启用', value: 1 },
            { label: '停用', value: 0 },
          ]}
          colProps={{ span: 12 }}
        />
        <ProFormTextArea
          name="remark"
          label="备注"
          placeholder="任务说明"
          colProps={{ span: 12 }}
        />
      </ModalForm>
    </>
  )
}
