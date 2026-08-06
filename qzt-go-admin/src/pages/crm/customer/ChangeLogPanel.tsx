import { useEffect, useState } from 'react'
import { Empty, Spin, Tag, Timeline, Typography } from 'antd'
import request from '../../../utils/request'
import { useUserStore } from '../../../stores/users'

interface FieldChange {
  id: number
  biz_type: string
  resource_id: number
  field: string
  field_label: string
  old_value: string
  new_value: string
  operator_id: number
  created_at: string
}

/** 按时间分组变更记录(同一次操作的多字段变更合并为一个时间线节点) */
function groupByTime(changes: FieldChange[]): FieldChange[][] {
  const groups: FieldChange[][] = []
  let current: FieldChange[] = []
  let lastTime = ''
  for (const c of changes) {
    // 同一秒内的变更归为一组
    const t = c.created_at.slice(0, 19)
    if (t !== lastTime && current.length > 0) {
      groups.push(current)
      current = []
    }
    current.push(c)
    lastTime = t
  }
  if (current.length > 0) groups.push(current)
  return groups
}

export default function ChangeLogPanel({
  bizType,
  resourceId,
}: {
  bizType: string
  resourceId: number
}) {
  const [loading, setLoading] = useState(true)
  const [changes, setChanges] = useState<FieldChange[]>([])
  const nickname = useUserStore((s) => s.nickname)

  useEffect(() => {
    if (!resourceId) return
    setLoading(true)
    request
      .get<unknown, FieldChange[]>('/crm/field-changes', {
        params: { biz_type: bizType, resource_id: resourceId },
      })
      .then((res) => setChanges(res || []))
      .catch(() => setChanges([]))
      .finally(() => setLoading(false))
  }, [bizType, resourceId])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin />
      </div>
    )
  }

  if (changes.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无变更记录" />
  }

  const groups = groupByTime(changes)

  return (
    <Timeline
      items={groups.map((group) => {
        const first = group[0]
        return {
          color: 'blue',
          children: (
            <div>
              <div style={{ marginBottom: 8 }}>
                <Tag color="blue">{nickname(first.operator_id)}</Tag>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {first.created_at}
                </Typography.Text>
              </div>
              {group.map((c) => (
                <div key={c.id} style={{ marginBottom: 4, fontSize: 13 }}>
                  <Typography.Text strong>{c.field_label || c.field}</Typography.Text>
                  <span style={{ margin: '0 8px' }}>
                    <Typography.Text type="secondary" delete>
                      {c.old_value || '(空)'}
                    </Typography.Text>
                    <span style={{ margin: '0 4px', color: '#999' }}>→</span>
                    <Typography.Text>{c.new_value || '(空)'}</Typography.Text>
                  </span>
                </div>
              ))}
            </div>
          ),
        }
      })}
    />
  )
}
