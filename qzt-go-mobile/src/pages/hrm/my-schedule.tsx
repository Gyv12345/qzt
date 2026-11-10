import { useEffect, useState } from 'react'
import { Button, Card, ErrorBlock, List, NavBar, Popup, SpinLoading, Tag } from 'antd-mobile'
import dayjs from 'dayjs'
import { mySchedule } from '../../services/hrm'
import type { MyScheduleRow } from '../../types/hrm'

/** 我的排班(移动端 P14):员工查本人当月班表,带假日标注 */
export default function MySchedulePage() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [rows, setRows] = useState<MyScheduleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const load = (m: string) => {
    setLoading(true)
    mySchedule(m)
      .then((r) => setRows(r.list ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(month)
  }, [month])

  // 近 6 个月可选(当月起往前推)
  const months = Array.from({ length: 6 }, (_, i) => dayjs().subtract(i, 'month').format('YYYY-MM'))

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar
        onBack={() => window.history.back()}
        right={
          <span onClick={() => setPickerOpen(true)} style={{ fontSize: 14 }}>
            {month}
          </span>
        }
      >
        我的排班
      </NavBar>

      {loading ? (
        <div style={{ paddingTop: '40vh', textAlign: 'center' }}>
          <SpinLoading style={{ '--size': '40px' }} />
        </div>
      ) : error ? (
        <ErrorBlock status="default" title="加载失败" description="未关联员工档案或网络异常" />
      ) : rows.length === 0 ? (
        <ErrorBlock
          status="default"
          title="本月暂无排班"
          description="请联系管理员在「排班管理」为你排班"
        />
      ) : (
        <div style={{ padding: 8 }}>
          {rows.map((r) => (
            <Card key={r.date} style={{ marginBottom: 8 }}>
              <List>
                <List.Item extra={r.shift_name}>
                  {r.date}
                  {r.is_holiday && (
                    <Tag color="warning" style={{ marginLeft: 8 }}>
                      {r.holiday_name || '放假'}
                    </Tag>
                  )}
                </List.Item>
                <List.Item extra={`${r.start_time} ~ ${r.end_time}`}>班次时间</List.Item>
              </List>
            </Card>
          ))}
        </div>
      )}

      {/* 月份选择弹层 */}
      <Popup visible={pickerOpen} onMaskClick={() => setPickerOpen(false)} bodyStyle={{ padding: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>选择月份</div>
        {months.map((m) => (
          <Button
            key={m}
            block
            size="small"
            style={{ marginBottom: 8 }}
            onClick={() => {
              setMonth(m)
              setPickerOpen(false)
            }}
          >
            {m}
          </Button>
        ))}
      </Popup>
    </div>
  )
}
