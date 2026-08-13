import { useEffect, useState } from 'react'
import { FloatingBubble, List, NavBar, Tabs, Tag } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createAccount, listAccounts } from '../../../services/finance'
import { ACCOUNT_TYPE, BALANCE_DIR, type FinAccount } from '../../../types/finance'
import FormSheet from '../../../components/FormSheet'

const TYPE_TABS = [
  { key: '', label: '全部' },
  ...Object.entries(ACCOUNT_TYPE).map(([k, v]) => ({ key: k, label: v.text })),
]

export default function AccountList() {
  const navigate = useNavigate()
  const [type, setType] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [list, setList] = useState<FinAccount[]>([])

  useEffect(() => {
    listAccounts({ type: type || undefined })
      .then((res) => setList(res || []))
      .catch(() => setList([]))
  }, [type])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>会计科目</NavBar>
      <Tabs activeKey={type} onChange={setType}>
        {TYPE_TABS.map((t) => (
          <Tabs.Tab key={t.key} title={t.label} />
        ))}
      </Tabs>
      <List>
        {list.map((a) => {
          const at = ACCOUNT_TYPE[a.type]
          return (
            <List.Item
              key={a.id}
              description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{a.code} · {BALANCE_DIR[a.balance_dir] || a.balance_dir}{a.is_leaf ? ' · 末级' : ''}</span>}
              extra={at ? <Tag color={at.color} fill="outline">{at.text}</Tag> : null}
            >
              {a.name}
            </List.Item>
          )
        })}
        {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无科目</span></List.Item>}
      </List>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title="新建科目"
        fields={[
          { name: 'code', label: '编码', type: 'text', required: true },
          { name: 'name', label: '名称', type: 'text', required: true },
          { name: 'type', label: '类型', type: 'select', required: true, options: Object.entries(ACCOUNT_TYPE).map(([k, v]) => ({ label: v.text, value: k })) },
          { name: 'balance_dir', label: '余额方向', type: 'select', required: true, options: [{ label: '借', value: 'DEBIT' }, { label: '贷', value: 'CREDIT' }] },
        ]}
        onClose={() => setShowNew(false)}
        onSubmit={async (v) => {
          await createAccount({ code: v.code, name: v.name, type: v.type, balance_dir: v.balance_dir })
          setShowNew(false)
        }}
      />
    </div>
  )
}
