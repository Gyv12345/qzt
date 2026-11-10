import { Tabs } from 'antd'
import ShiftPanel from './ShiftPanel'
import HolidayPanel from './HolidayPanel'
import SchedulePanel from './SchedulePanel'

/** 排班管理:班次/节假日/排班月视图(P14) */
export default function SchedulePage() {
  return (
    <Tabs
      items={[
        { key: 'schedule', label: '排班月视图', children: <SchedulePanel /> },
        { key: 'shift', label: '班次设置', children: <ShiftPanel /> },
        { key: 'holiday', label: '节假日', children: <HolidayPanel /> },
      ]}
    />
  )
}
