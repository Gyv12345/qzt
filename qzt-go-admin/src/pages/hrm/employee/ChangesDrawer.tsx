import { Drawer, Space, Spin, Tag, Timeline } from 'antd'
import dayjs from 'dayjs'
import type { HrmEmployee, HrmEmployeeChange } from '../../../types/hrm'

const changeTypeMap: Record<string, { color: string; text: string }> = {
  HIRE: { color: 'green', text: '入职' },
  TRANSFER: { color: 'blue', text: '调动' },
  RESIGN: { color: 'red', text: '离职' },
}

interface ChangesDrawerProps {
  open: boolean
  employee: HrmEmployee | null
  changes: HrmEmployeeChange[]
  loading: boolean
  deptName: (id: number | null) => string
  positionName: (id: number | null) => string
  onClose: () => void
}

/** 员工变更履历抽屉(入职/调动/离职 Timeline) */
export default function ChangesDrawer({
  open,
  employee,
  changes,
  loading,
  deptName,
  positionName,
  onClose,
}: ChangesDrawerProps) {
  return (
    <Drawer
      title={employee ? `${employee.name} 的变更履历` : '变更履历'}
      open={open}
      onClose={onClose}
      width={480}
    >
      <Spin spinning={loading}>
        {changes.length ? (
          <Timeline
            items={changes.map((c) => {
              const type = changeTypeMap[c.change_type]
              return {
                color: type?.color ?? 'gray',
                children: (
                  <div>
                    <Space size={8}>
                      <Tag color={type?.color}>{type?.text ?? c.change_type}</Tag>
                      <span style={{ color: '#999', fontSize: 12 }}>
                        {dayjs(c.created_at).format('YYYY-MM-DD HH:mm')}
                      </span>
                    </Space>
                    {(c.from_department_id || c.to_department_id) && (
                      <div style={{ marginTop: 4 }}>
                        部门:{deptName(c.from_department_id)} → {deptName(c.to_department_id)}
                      </div>
                    )}
                    {(c.from_position_id || c.to_position_id) && (
                      <div style={{ marginTop: 4 }}>
                        岗位:{positionName(c.from_position_id)} → {positionName(c.to_position_id)}
                      </div>
                    )}
                    {c.reason && <div style={{ marginTop: 4 }}>原因:{c.reason}</div>}
                  </div>
                ),
              }
            })}
          />
        ) : (
          !loading && <div style={{ color: '#999' }}>暂无变更履历</div>
        )}
      </Spin>
    </Drawer>
  )
}
