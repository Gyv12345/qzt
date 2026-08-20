import { useRef } from 'react'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { listAttendanceSummary } from '../../../services/hrm'
import type { HrmAttendanceSummary } from '../../../types/hrm'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function AttendancePage() {
  const actionRef = useRef<ActionType>(null)

  const columns: ProColumns<HrmAttendanceSummary>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '工号', dataIndex: 'emp_no', width: 100, search: false },
    { title: '姓名', dataIndex: 'emp_name', width: 100 },
    { title: '部门', dataIndex: 'dept_name', width: 120, search: false },
    {
      title: '月份',
      dataIndex: 'year_month',
      width: 100,
      valueType: 'dateMonth',
      render: (_, r) => r.year_month,
    },
    { title: '应出勤', dataIndex: 'should_days', width: 80, search: false },
    { title: '实际出勤', dataIndex: 'actual_days', width: 80, search: false },
    { title: '迟到', dataIndex: 'late_count', width: 70, search: false },
    { title: '早退', dataIndex: 'early_count', width: 70, search: false },
    { title: '缺卡', dataIndex: 'miss_count', width: 70, search: false },
    { title: '请假', dataIndex: 'leave_days', width: 70, search: false },
    { title: '加班', dataIndex: 'overtime_hours', width: 70, search: false },
  ]

  return (
    <ProTable<HrmAttendanceSummary>
      rowKey="id"
      actionRef={actionRef}
      columns={columns}
      scroll={{ x: 'max-content' }}
      request={async (params) => {
        const { current, pageSize, ...rest } = params
        const data = await listAttendanceSummary({
          page: current || 1,
          page_size: pageSize || 10,
          ...rest,
        })
        return { data: data.list || [], total: data.total || 0, success: true }
      }}
      toolBarRender={false}
      headerTitle="考勤打卡"
    />
  )
}
