import { useRef, useState } from 'react'
import { App, Button, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormDigit,
  ProFormRadio,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import { Form } from 'antd'
import Auth from '../../../components/Auth'
import {
  createShift,
  deleteShift,
  listShifts,
  updateShift,
} from '../../../services/hrm'
import type { HrmShift } from '../../../types/hrm'
import { pageIndexColumn } from '../../../components/IndexTag'

interface ShiftFormValues {
  name: string
  start_time: string
  end_time: string
  flex_minutes?: number
  cross_day?: number
}

/** 班次设置 Tab */
export default function ShiftPanel() {
  const { message, modal } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [formRef] = Form.useForm<ShiftFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<HrmShift | null>(null)

  const openCreate = () => {
    setEditing(null)
    formRef.resetFields()
    setModalOpen(true)
  }

  const openEdit = (r: HrmShift) => {
    setEditing(r)
    formRef.setFieldsValue({
      name: r.name,
      start_time: r.start_time,
      end_time: r.end_time,
      flex_minutes: r.flex_minutes,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: ShiftFormValues) => {
    const payload = {
      name: values.name,
      start_time: values.start_time,
      end_time: values.end_time,
      flex_minutes: values.flex_minutes ?? 0,
      cross_day: values.cross_day ?? 0,
      status: 1,
    }
    if (editing) {
      await updateShift(editing.id, payload)
      message.success('班次已更新')
    } else {
      await createShift(payload)
      message.success('班次已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = (r: HrmShift) => {
    modal.confirm({
      title: '删除班次',
      content: '确认删除该班次?',
      onOk: async () => {
        await deleteShift(r.id)
        message.success('已删除')
        actionRef.current?.reload()
      },
    })
  }

  const columns: ProColumns<HrmShift>[] = [
    pageIndexColumn(actionRef),
    { title: '名称', dataIndex: 'name', width: 140, search: false },
    { title: '上班时间', dataIndex: 'start_time', width: 110, search: false },
    { title: '下班时间', dataIndex: 'end_time', width: 110, search: false },
    { title: '弹性(分钟)', dataIndex: 'flex_minutes', width: 100, search: false },
    { title: '跨天', dataIndex: 'cross_day', width: 70, search: false, render: (v) => (v ? '是' : '否') },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, r) => (
        <Space>
          <Auth perm="hrm:schedule:edit">
            <Button type="link" size="small" onClick={() => openEdit(r)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="hrm:schedule:delete">
            <Button type="link" size="small" danger onClick={() => handleDelete(r)}>
              删除
            </Button>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<HrmShift>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        request={async ({ current, pageSize }) => {
          const res = await listShifts({ page: current, page_size: pageSize })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10 }}
        toolBarRender={() => [
          <Auth perm="hrm:schedule:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建班次
            </Button>
          </Auth>,
        ]}
        headerTitle="班次设置"
      />
      <ModalForm<ShiftFormValues>
        form={formRef}
        title={editing ? '编辑班次' : '新建班次'}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true }}
        width={480}
      >
        <ProFormText
          name="name"
          label="班次名称"
          rules={[{ required: true, message: '请输入班次名称' }]}
        />
        <ProFormText
          name="start_time"
          label="上班时间(HH:mm:ss)"
          rules={[{ required: true, message: '如 09:00:00' }]}
          placeholder="09:00:00"
        />
        <ProFormText
          name="end_time"
          label="下班时间(HH:mm:ss)"
          rules={[{ required: true, message: '如 18:00:00' }]}
          placeholder="18:00:00"
        />
        <ProFormDigit name="flex_minutes" label="弹性分钟数" min={0} fieldProps={{ precision: 0 }} />
        <ProFormRadio.Group
          name="cross_day"
          label="跨天班次"
          options={[
            { label: '否', value: 0 },
            { label: '是', value: 1 },
          ]}
          initialValue={0}
        />
      </ModalForm>
    </>
  )
}
