import { useEffect, useState } from 'react'
import { App, Button, Card, DatePicker, Space, Table, Tag } from 'antd'
import {
  ModalForm,
  ProFormDatePicker,
  ProFormList,
  ProFormSelect,
} from '@ant-design/pro-components'
import dayjs from 'dayjs'
import Auth from '../../../components/Auth'
import {
  batchSchedule,
  deleteSchedule,
  listEmployees,
  listScheduleMonth,
  listShifts,
} from '../../../services/hrm'
import type {
  HrmScheduleMonthRow,
  HrmShift,
} from '../../../types/hrm'

const STATUS_COLOR: Record<string, string> = { MANUAL: 'blue', GROUP: 'purple' }

/** 排班月视图 Tab:员工月历排班(批量 upsert) */
export default function SchedulePanel() {
  const { message } = App.useApp()
  const [month, setMonth] = useState<dayjs.Dayjs>(dayjs())
  const [rows, setRows] = useState<HrmScheduleMonthRow[]>([])
  const [shifts, setShifts] = useState<HrmShift[]>([])
  const [emps, setEmps] = useState<{ label: string; value: number }[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = (m: string) => {
    setLoading(true)
    listScheduleMonth(m)
      .then((res) => setRows(res.list ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(month.format('YYYY-MM'))
    listShifts({ page: 1, page_size: 50 }).then((r) => setShifts(r.list ?? []))
    listEmployees({ page: 1, page_size: 100 }).then((r) =>
      setEmps((r.list ?? []).map((e) => ({ label: e.name, value: e.id }))),
    )
  }, [month])

  const columns = [
    { title: '日期', dataIndex: 'schedule_date', width: 130, render: (v: string) => (v || '').slice(0, 10) },
    { title: '员工', dataIndex: 'employee_name', width: 120, render: (v: string) => v || '-' },
    { title: '班次', dataIndex: 'shift_name', width: 140, render: (v: string) => v || `#${1}` },
    {
      title: '时间',
      key: 'time',
      width: 150,
      render: (_: unknown, r: HrmScheduleMonthRow) => `${r.start_time}~${r.end_time}`,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 90,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
    },
    {
      title: '操作',
      key: 'op',
      render: (_: unknown, r: HrmScheduleMonthRow) => (
        <Auth perm="hrm:schedule:delete">
          <Button
            type="link"
            size="small"
            danger
            onClick={() => {
              deleteSchedule(r.id).then(() => {
                message.success('已删除')
                load(month.format('YYYY-MM'))
              })
            }}
          >
            删除
          </Button>
        </Auth>
      ),
    },
  ]

  return (
    <Card
      title="排班月视图"
      extra={
        <Space>
          <DatePicker picker="month" value={month} onChange={(v) => v && setMonth(v)} />
          <Auth perm="hrm:schedule:add">
            <Button type="primary" onClick={() => setModalOpen(true)}>
              批量排班
            </Button>
          </Auth>
        </Space>
      }
    >
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
      />
      <BatchScheduleModal
        open={modalOpen}
        emps={emps}
        shifts={shifts}
        onClose={() => setModalOpen(false)}
        onDone={() => {
          setModalOpen(false)
          load(month.format('YYYY-MM'))
        }}
      />
    </Card>
  )
}

/** 批量排班弹窗:员工 + 多条「日期+班次」 */
function BatchScheduleModal({
  open,
  emps,
  shifts,
  onClose,
  onDone,
}: {
  open: boolean
  emps: { label: string; value: number }[]
  shifts: HrmShift[]
  onClose: () => void
  onDone: () => void
}) {
  const { message } = App.useApp()
  const handleSubmit = async (values: {
    employee_id: number
    items: { date: string; shift_id: number }[]
  }) => {
    await batchSchedule({
      employee_id: values.employee_id,
      items: (values.items ?? []).map((it) => ({
        date: dayjs(it.date).format('YYYY-MM-DD'),
        shift_id: it.shift_id,
      })),
    })
    message.success('排班已保存')
    onDone()
    return true
  }

  return (
    <ModalForm<{
      employee_id: number
      items: { date: string; shift_id: number }[]
    }>
      title="批量排班(同员工同日期覆盖)"
      open={open}
      onOpenChange={(v) => (!v ? onClose() : undefined)}
      onFinish={handleSubmit}
      modalProps={{ destroyOnHidden: true }}
      width={640}
    >
      <ProFormSelect
        name="employee_id"
        label="员工"
        rules={[{ required: true, message: '请选择员工' }]}
        options={emps}
        showSearch
        fieldProps={{ optionFilterProp: 'label' }}
      />
        <ProFormList
          name="items"
          label="排班明细(日期+班次)"
          min={1}
          creatorRecord={{ date: dayjs(), shift_id: shifts[0]?.id }}
          creatorButtonProps={{ creatorButtonText: '添加排班日' }}
        >
          <ProFormDatePicker
            name="date"
            label="日期"
            rules={[{ required: true, message: '请选择日期' }]}
          />
          <ProFormSelect
            name="shift_id"
            label="班次"
            rules={[{ required: true, message: '请选择班次' }]}
            options={shifts.map((s) => ({ label: `${s.name} ${s.start_time}~${s.end_time}`, value: s.id }))}
          />
        </ProFormList>
      </ModalForm>
    )
}
