import { useEffect, useState } from 'react'
import { Card, Dialog, ErrorBlock, List, NavBar, SpinLoading, Tag, Toast } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
dayjs.locale('zh-cn')
import { clockIn, listMyClocks } from '../../services/hrm'
import type { HrmClockRecord } from '../../types/hrm'

const todayStr = () => dayjs().format('YYYY-MM-DD')
const fmtTime = (t?: string) => (t ? dayjs(t).format('HH:mm:ss') : '')

export default function ClockPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<HrmClockRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [acting, setActing] = useState(false)

  const load = () => {
    setLoading(true)
    setFailed(false)
    // 最近 7 天
    listMyClocks({
      start_date: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
      end_date: todayStr(),
    })
      .then((res) => {
        // 按时间倒序
        const sorted = (res || []).slice().sort((a, b) => (a.clock_time > b.clock_time ? -1 : 1))
        setRecords(sorted)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  // 今日打卡
  const today = todayStr()
  const todayRecs = records.filter((r) => r.clock_date?.slice(0, 10) === today)
  const checkIn = todayRecs.find((r) => r.clock_type === 'CHECK_IN')
  const checkOut = todayRecs.find((r) => r.clock_type === 'CHECK_OUT')

  // 下一打卡动作:没上班卡→上班打卡;有上班卡没下班卡→下班打卡;都有→已打满
  const nextAction: 'CHECK_IN' | 'CHECK_OUT' | null = !checkIn
    ? 'CHECK_IN'
    : !checkOut
      ? 'CHECK_OUT'
      : null

  const onClock = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    const label = type === 'CHECK_IN' ? '上班' : '下班'
    const ok = await Dialog.confirm({ content: `确定${label}打卡?` })
    if (!ok) return
    setActing(true)
    try {
      await clockIn({ clock_type: type })
      Toast.show({ icon: 'success', content: `${label}打卡成功` })
      load()
    } catch {
      // 拦截器已 toast
    } finally {
      setActing(false)
    }
  }

  // 按日期分组历史
  const groupByDate: Record<string, HrmClockRecord[]> = {}
  for (const r of records) {
    const d = r.clock_date?.slice(0, 10) || '未知'
    ;(groupByDate[d] = groupByDate[d] || []).push(r)
  }
  const dates = Object.keys(groupByDate).sort((a, b) => (a > b ? -1 : 1))

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 24 }}>
      <NavBar onBack={() => navigate(-1)}>考勤打卡</NavBar>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <SpinLoading style={{ '--size': '36px' }} />
        </div>
      ) : failed ? (
        <div style={{ paddingTop: 60 }}>
          <ErrorBlock status="default" title="加载失败" description="请确认已关联员工档案后重试" />
        </div>
      ) : (
        <>
          {/* 今日打卡状态 + 打卡按钮 */}
          <div
            style={{
              margin: 8,
              padding: '24px 16px',
              background: 'var(--brand-gradient)',
              borderRadius: 14,
              color: '#fff',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              {dayjs().format('YYYY年MM月DD日 dddd')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, margin: '16px 0' }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>上班打卡</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                  {checkIn ? fmtTime(checkIn.clock_time) : '--:--:--'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>下班打卡</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                  {checkOut ? fmtTime(checkOut.clock_time) : '--:--:--'}
                </div>
              </div>
            </div>
            {nextAction ? (
              <button
                onClick={() => onClock(nextAction)}
                disabled={acting}
                style={{
                  border: 'none',
                  borderRadius: 24,
                  padding: '10px 48px',
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--brand)',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                {acting ? '打卡中...' : nextAction === 'CHECK_IN' ? '上班打卡' : '下班打卡'}
              </button>
            ) : (
              <div style={{ fontSize: 14, opacity: 0.9 }}>今日上下班均已打卡 ✅</div>
            )}
          </div>

          {/* 最近 7 天记录 */}
          <Card title="最近打卡记录" style={{ margin: 8 }}>
            {dates.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: 16 }}>暂无打卡记录</div>
            ) : (
              <List>
                {dates.map((d) => (
                  <List.Item
                    key={d}
                    description={
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {groupByDate[d]
                          .sort((a, b) => (a.clock_type > b.clock_type ? 1 : -1))
                          .map((r) => `${r.clock_type === 'CHECK_IN' ? '上班' : '下班'} ${fmtTime(r.clock_time)}`)
                          .join('  ·  ')}
                      </span>
                    }
                    extra={
                      groupByDate[d].some((r) => r.source === 'WECOM') ? (
                        <Tag color="primary" fill="outline" style={{ fontSize: 10 }}>
                          企微
                        </Tag>
                      ) : null
                    }
                  >
                    {dayjs(d).format('MM-DD dddd')}
                  </List.Item>
                ))}
              </List>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
