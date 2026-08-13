import { Popup, SearchBar, List, SpinLoading } from 'antd-mobile'
import { useEffect, useState } from 'react'
import { listEmployees } from '../services/hrm'
import type { HrmEmployee } from '../types/hrm'

interface Props {
  visible: boolean
  onClose: () => void
  onPick: (emp: { id: number; name: string }) => void
}

/** 员工选择弹层(搜索式,用于绩效/考勤/薪资等需选员工的场景) */
export default function EmployeePicker({ visible, onClose, onPick }: Props) {
  const [kw, setKw] = useState('')
  const [list, setList] = useState<HrmEmployee[]>([])
  const [loading, setLoading] = useState(false)

  const search = (k: string) => {
    setLoading(true)
    listEmployees({ page: 1, page_size: 20, keyword: k || undefined })
      .then((r) => setList(r.list || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (visible) search('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      destroyOnClose
      bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ padding: '12px 16px', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>选择员工</div>
      <div style={{ padding: '0 12px' }}>
        <SearchBar
          placeholder="搜索姓名/工号"
          value={kw}
          onChange={(v) => {
            setKw(v)
            search(v)
          }}
          onClear={() => {
            setKw('')
            search('')
          }}
        />
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>
        ) : list.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 24 }}>无匹配员工</div>
        ) : (
          <List>
            {list.map((e) => (
              <List.Item
                key={e.id}
                description={`${e.emp_no || '-'} · ${e.department_name || '-'}`}
                onClick={() => {
                  onPick({ id: e.id, name: e.name })
                  onClose()
                }}
              >
                {e.name}
              </List.Item>
            ))}
          </List>
        )}
      </div>
    </Popup>
  )
}
