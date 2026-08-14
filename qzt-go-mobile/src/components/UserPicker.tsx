import { Popup, SearchBar, List, SpinLoading } from 'antd-mobile'
import { useCallback, useEffect, useState } from 'react'
import { listUsers, type SysUserOption } from '../services/user'

interface Props {
  visible: boolean
  title?: string
  onClose: () => void
  onPick: (user: SysUserOption) => void
}

/** 通用用户选择器:Popup + 搜索 + 列表(用于客户/线索转移选负责人等) */
export default function UserPicker({ visible, title = '选择用户', onClose, onPick }: Props) {
  const [keyword, setKeyword] = useState('')
  const [list, setList] = useState<SysUserOption[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (kw: string) => {
    setLoading(true)
    try {
      const r = await listUsers({ keyword: kw || undefined, limit: 50 })
      setList(r.list || [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 打开时加载首页;输入防抖 350ms 查询
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => load(keyword), 350)
    return () => clearTimeout(t)
  }, [visible, keyword, load])

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      destroyOnClose
      bodyStyle={{
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '12px 16px', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>{title}</div>
      <div style={{ padding: '0 12px' }}>
        <SearchBar
          placeholder="搜索姓名/用户名"
          value={keyword}
          onChange={(v) => setKeyword(v)}
          onClear={() => setKeyword('')}
        />
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <SpinLoading />
          </div>
        ) : list.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 24 }}>无匹配用户</div>
        ) : (
          <List>
            {list.map((u) => (
              <List.Item key={u.id} onClick={() => onPick(u)} description={u.username}>
                {u.nickname || u.username}
              </List.Item>
            ))}
          </List>
        )}
      </div>
    </Popup>
  )
}
