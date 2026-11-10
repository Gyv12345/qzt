import { useRef, useState } from 'react'
import { App, Button, Form, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormRadio,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  createHoliday,
  deleteHoliday,
  listHolidays,
  updateHoliday,
} from '../../../services/hrm'
import type { HrmHoliday } from '../../../types/hrm'
import { pageIndexColumn } from '../../../components/IndexTag'

const TYPE_COLOR: Record<string, string> = { HOLIDAY: 'green', WORKDAY: 'orange' }
const TYPE_TEXT: Record<string, string> = { HOLIDAY: '放假', WORKDAY: '补班' }

/** 节假日 Tab */
export default function HolidayPanel() {
  const { message, modal } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [formRef] = Form.useForm<HolidayFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<HrmHoliday | null>(null)

  interface HolidayFormValues {
    holiday_date: string
    name: string
    type: string
  }

  const openCreate = () => {
    setEditing(null)
    formRef.resetFields()
    setModalOpen(true)
  }

  const openEdit = (r: HrmHoliday) => {
    setEditing(r)
    formRef.setFieldsValue({ name: r.name, type: r.type })
    setModalOpen(true)
  }

  const handleSubmit = async (values: HolidayFormValues) => {
    if (editing) {
      await updateHoliday(editing.id, { name: values.name, type: values.type })
      message.success('已更新')
    } else {
      await createHoliday(values)
      message.success('节假日已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = (r: HrmHoliday) => {
    modal.confirm({
      title: '删除节假日',
      content: '确认删除该节假日配置?',
      onOk: async () => {
        await deleteHoliday(r.id)
        message.success('已删除')
        actionRef.current?.reload()
      },
    })
  }

  const columns: ProColumns<HrmHoliday>[] = [
    pageIndexColumn(actionRef),
    { title: '日期', dataIndex: 'holiday_date', width: 130, search: false },
    { title: '名称', dataIndex: 'name', width: 160, search: false },
    {
      title: '类型',
      dataIndex: 'type',
      width: 90,
      search: false,
      render: (_, r) => <Tag color={TYPE_COLOR[r.type]}>{TYPE_TEXT[r.type] ?? r.type}</Tag>,
    },
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
      <ProTable<HrmHoliday>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        request={async ({ current, pageSize }) => {
          const res = await listHolidays({ page: current, page_size: pageSize })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10 }}
        toolBarRender={() => [
          <Auth perm="hrm:schedule:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建节假日
            </Button>
          </Auth>,
        ]}
        headerTitle="节假日(法定假日+调休补班)"
      />
      <ModalForm<HolidayFormValues>
        form={formRef}
        title={editing ? '编辑节假日' : '新建节假日'}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true }}
        width={440}
      >
        <ProFormText
          name="holiday_date"
          label="日期(yyyy-MM-dd)"
          rules={[{ required: true, message: '如 2026-10-01' }]}
          placeholder="2026-10-01"
        />
        <ProFormText name="name" label="名称" rules={[{ required: true, message: '如 国庆节' }]} />
        <ProFormRadio.Group
          name="type"
          label="类型"
          rules={[{ required: true }]}
          options={[
            { label: '放假', value: 'HOLIDAY' },
            { label: '调休补班', value: 'WORKDAY' },
          ]}
          initialValue="HOLIDAY"
        />
      </ModalForm>
    </>
  )
}
