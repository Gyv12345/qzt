import { useCallback, useState } from 'react'
import { Dialog, FloatingBubble, InfiniteScroll, List, NavBar, Popup, PullToRefresh, SearchBar, SpinLoading, Tag, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { listCustomers } from '../../services/crm'
import { createContact, deleteContact, listContacts } from '../../services/contact'
import type { CrmContact } from '../../types/crm'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import FormSheet from '../../components/FormSheet'
import { dialWithDedup } from '../../utils/dial'

export default function ContactListPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listContacts({ ...params, keyword: keyword || undefined }),
    [keyword],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<CrmContact>(fetcher, { page_size: 20 })

  // 新建联系人:先选客户,再填信息
  const [showCustPicker, setShowCustPicker] = useState(false)
  const [custKw, setCustKw] = useState('')
  const [custList, setCustList] = useState<{ id: number; name: string; customer_no: string }[]>([])
  const [custLoading, setCustLoading] = useState(false)
  const [selectedCust, setSelectedCust] = useState<{ id: number; name: string } | null>(null)
  const [showForm, setShowForm] = useState(false)

  const searchCust = (kw: string) => {
    setCustLoading(true)
    listCustomers({ page: 1, page_size: 20, keyword: kw || undefined })
      .then((r) => setCustList(r.list || []))
      .catch(() => setCustList([]))
      .finally(() => setCustLoading(false))
  }

  const onNew = () => {
    setShowCustPicker(true)
    searchCust('')
  }

  const onPickCust = (c: { id: number; name: string }) => {
    setSelectedCust({ id: c.id, name: c.name })
    setShowCustPicker(false)
    setShowForm(true)
  }

  const onDelete = async (c: CrmContact) => {
    const ok = await Dialog.confirm({ content: `确定删除联系人「${c.name}」?` })
    if (!ok) return
    try {
      await deleteContact(c.id)
      Toast.show({ icon: 'success', content: '已删除' })
      refresh()
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>联系人</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar
          placeholder="搜索姓名/电话"
          value={keyword}
          onChange={setKeyword}
          onSearch={() => refresh()}
          onClear={() => {
            setKeyword('')
            refresh()
          }}
        />
      </div>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((c) => (
            <List.Item
              key={c.id}
              description={
                <span style={{ fontSize: 12 }}>
                  {c.phone && (
                    <span
                      style={{ color: 'var(--brand)', textDecoration: 'underline' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        dialWithDedup(c.phone, {
                          name: c.name,
                          onPickExisting: (type, rid) => navigate(type === 'customer' ? `/customer/${rid}` : `/lead/${rid}`),
                        })
                      }}
                    >
                      📞 {c.phone}
                    </span>
                  )}
                  {c.position ? ` · ${c.position}` : ''}
                </span>
              }
              extra={<a style={{ color: '#ff4d4f', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onDelete(c) }}>删除</a>}
            >
              {c.name}
              {c.is_key_decision_maker === 1 && (
                <Tag color="warning" fill="outline" style={{ marginLeft: 6 }}>决策人</Tag>
              )}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无联系人</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={onNew}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      {/* 第一步:选客户 */}
      <Popup
        visible={showCustPicker}
        onMaskClick={() => setShowCustPicker(false)}
        position="bottom"
        destroyOnClose
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '12px 16px', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>选择客户</div>
        <div style={{ padding: '0 12px' }}>
          <SearchBar
            placeholder="搜索客户"
            value={custKw}
            onChange={(v) => {
              setCustKw(v)
              searchCust(v)
            }}
            onClear={() => {
              setCustKw('')
              searchCust('')
            }}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {custLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>
          ) : custList.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 24 }}>无匹配客户</div>
          ) : (
            <List>
              {custList.map((c) => (
                <List.Item key={c.id} description={c.customer_no} onClick={() => onPickCust(c)}>
                  {c.name}
                </List.Item>
              ))}
            </List>
          )}
        </div>
      </Popup>

      {/* 第二步:填联系人信息 */}
      <FormSheet
        visible={showForm}
        title={selectedCust ? `新建联系人 · ${selectedCust.name}` : '新建联系人'}
        fields={[
          { name: 'name', label: '姓名', type: 'text', required: true },
          { name: 'phone', label: '电话', type: 'text' },
          { name: 'position', label: '职位', type: 'text' },
          { name: 'email', label: '邮箱', type: 'text' },
          { name: 'remark', label: '备注', type: 'text' },
        ]}
        onClose={() => setShowForm(false)}
        onSubmit={async (v) => {
          if (!selectedCust) return
          await createContact(selectedCust.id, {
            name: v.name,
            phone: v.phone || undefined,
            position: v.position || undefined,
            email: v.email || undefined,
            remark: v.remark || undefined,
          })
          refresh()
        }}
      />
    </div>
  )
}
