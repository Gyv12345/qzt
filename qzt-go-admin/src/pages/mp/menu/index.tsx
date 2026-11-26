import { useEffect, useState } from 'react'
import { App, Button, Card, Empty, Input, Popconfirm, Select, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import Auth from '../../../components/Auth'
import {
  deleteAccountMenu,
  getAccountMenu,
  listAccounts,
  saveAccountMenu,
} from '../../../services/mp'
import type { MpAccount, MpMenuItem } from '../../../types/mp'

/** 选中态:root=一级下标,sub=null 表示选中的是一级本身 */
interface Selection {
  root: number
  sub: number | null
}

/** 微信自定义菜单硬性约束 */
const MAX_ROOT = 3
const MAX_SUB = 5

/** rune 长度(汉字按 1 个字算) */
const runeLen = (s: string): number => Array.from(s ?? '').length

const newMenuItem = (): MpMenuItem => ({ name: '', type: 'view' })

const URL_PATTERN = /^https?:\/\//

function swap<T>(arr: T[], i: number, j: number): T[] {
  const copy = [...arr]
  const tmp = copy[i]
  copy[i] = copy[j]
  copy[j] = tmp
  return copy
}

/** 保存前前端校验:数量/名称长度/URL 必填,返回第一条错误文案(无错返回 null) */
const validateButtons = (buttons: MpMenuItem[]): string | null => {
  if (buttons.length === 0) return '请至少添加一个一级菜单'
  if (buttons.length > MAX_ROOT) return `一级菜单不能超过 ${MAX_ROOT} 个`
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i]
    const label = `第 ${i + 1} 个一级菜单`
    const rootLen = runeLen(b.name)
    if (rootLen === 0) return `${label}名称不能为空`
    if (rootLen > 4) return `${label}「${b.name}」名称超限(最多 4 个汉字)`
    const subs = b.sub_button ?? []
    if (subs.length > MAX_SUB) return `「${b.name}」子菜单不能超过 ${MAX_SUB} 个`
    if (subs.length > 0) {
      for (let j = 0; j < subs.length; j++) {
        const s = subs[j]
        const subLen = runeLen(s.name)
        if (subLen === 0) return `「${b.name}」第 ${j + 1} 个子菜单名称不能为空`
        if (subLen > 8) return `「${b.name}」第 ${j + 1} 个子菜单名称超限(最多 8 个汉字)`
        if (!URL_PATTERN.test(s.url ?? '')) return `「${b.name}」第 ${j + 1} 个子菜单需填写 http/https 跳转地址`
      }
    } else if (!URL_PATTERN.test(b.url ?? '')) {
      return `${label}「${b.name}」需填写 http/https 跳转地址(无子菜单的一级菜单点击直接跳转)`
    }
  }
  return null
}

export default function MpMenuPage() {
  const { message, modal } = App.useApp()
  const [accounts, setAccounts] = useState<MpAccount[]>([])
  const [accountId, setAccountId] = useState<number | null>(null)
  const [buttons, setButtons] = useState<MpMenuItem[]>([])
  const [sel, setSel] = useState<Selection | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [menuLoading, setMenuLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listAccounts()
      .then((list) => setAccounts(list.filter((a) => a.enabled === 1)))
      .catch(() => setAccounts([]))
  }, [])

  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null

  const resetEditor = () => {
    setButtons([])
    setSel(null)
    setExpanded(null)
  }

  const handleAccountChange = (value: number) => {
    setAccountId(value)
    resetEditor()
  }

  /** 拉取线上菜单覆盖本地编辑 */
  const handleLoad = async () => {
    if (!accountId) return
    setMenuLoading(true)
    try {
      const state = await getAccountMenu(accountId)
      setButtons(state.buttons ?? [])
      setSel(null)
      setExpanded(null)
      message.success(state.is_menu_open ? '已拉取当前线上菜单' : '已拉取菜单配置(该公众号菜单开关未开启)')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '拉取菜单失败')
    } finally {
      setMenuLoading(false)
    }
  }

  /** 校验 → 二次确认 → 发布到微信 */
  const handleSave = () => {
    if (!accountId) {
      message.warning('请先选择公众号账号')
      return
    }
    const err = validateButtons(buttons)
    if (err) {
      message.error(err)
      return
    }
    modal.confirm({
      title: '确认发布菜单?',
      content: '将全量替换公众号现有菜单;微信侧 24 小时内对全部粉丝生效(取关重关立即生效)。',
      okText: '确认发布',
      cancelText: '取消',
      onOk: async () => {
        setSaving(true)
        try {
          await saveAccountMenu(accountId, buttons)
          message.success('菜单已发布,微信侧生效可能有延迟')
        } catch (e) {
          message.error(e instanceof Error ? e.message : '发布菜单失败')
          throw e
        } finally {
          setSaving(false)
        }
      },
    })
  }

  const handleDeleteMenu = async () => {
    if (!accountId) return
    try {
      await deleteAccountMenu(accountId)
      resetEditor()
      message.success('菜单已删除')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除菜单失败')
    }
  }

  // ---------- 本地编辑操作 ----------

  const addRoot = () => {
    if (buttons.length >= MAX_ROOT) {
      message.warning(`一级菜单最多 ${MAX_ROOT} 个`)
      return
    }
    const idx = buttons.length
    setButtons([...buttons, newMenuItem()])
    setSel({ root: idx, sub: null })
    setExpanded(idx)
  }

  const addSub = (rootIdx: number) => {
    const root = buttons[rootIdx]
    if (!root) return
    const subs = root.sub_button ?? []
    if (subs.length >= MAX_SUB) {
      message.warning(`子菜单最多 ${MAX_SUB} 个`)
      return
    }
    setButtons((prev) =>
      prev.map((b, i) => (i === rootIdx ? { ...b, sub_button: [...(b.sub_button ?? []), newMenuItem()] } : b)),
    )
    setSel({ root: rootIdx, sub: subs.length })
    setExpanded(rootIdx)
  }

  const patchSel = (patch: Partial<MpMenuItem>) => {
    if (!sel) return
    setButtons((prev) =>
      prev.map((b, i) => {
        if (i !== sel.root) return b
        if (sel.sub === null) return { ...b, ...patch }
        return {
          ...b,
          sub_button: (b.sub_button ?? []).map((s, j) => (j === sel.sub ? { ...s, ...patch } : s)),
        }
      }),
    )
  }

  const removeSel = () => {
    if (!sel) return
    if (sel.sub === null) {
      setButtons((prev) => prev.filter((_, i) => i !== sel.root))
    } else {
      setButtons((prev) =>
        prev.map((b, i) =>
          i === sel.root ? { ...b, sub_button: (b.sub_button ?? []).filter((_, j) => j !== sel.sub) } : b,
        ),
      )
    }
    setSel(null)
    setExpanded(null)
  }

  const moveSel = (dir: -1 | 1) => {
    if (!sel) return
    const cur: Selection = { ...sel }
    if (cur.sub === null) {
      const to = cur.root + dir
      if (to < 0 || to >= buttons.length) return
      setButtons(swap(buttons, cur.root, to))
      setSel({ root: to, sub: null })
      setExpanded(to)
    } else {
      const subs = buttons[cur.root]?.sub_button ?? []
      const to = cur.sub + dir
      if (to < 0 || to >= subs.length) return
      setButtons((prev) =>
        prev.map((b, i) => (i === cur.root ? { ...b, sub_button: swap(b.sub_button ?? [], cur.sub!, to) } : b)),
      )
      setSel({ root: cur.root, sub: to })
    }
  }

  // ---------- 渲染 ----------

  const renderRootCell = (item: MpMenuItem, i: number) => {
    const selected = sel?.root === i
    return (
      <div
        key={i}
        style={{ flex: 1, position: 'relative', minWidth: 0, borderLeft: i > 0 ? '1px solid #f0f0f0' : undefined }}
      >
        {/* 二级浮层:白底 + 小三角,纵向排列,底部「+」添加 */}
        {expanded === i && (
          <div
            style={{
              position: 'absolute',
              bottom: 64,
              left: 2,
              right: 2,
              background: '#fff',
              border: '1px solid #e8e8e8',
              borderRadius: 4,
              boxShadow: '0 3px 10px rgba(0,0,0,.15)',
              zIndex: 20,
            }}
          >
            {(item.sub_button ?? []).map((s, j) => {
              const subSelected = selected && sel?.sub === j
              return (
                <div
                  key={j}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSel({ root: i, sub: j })
                  }}
                  style={{
                    padding: '10px 4px',
                    textAlign: 'center',
                    fontSize: 13,
                    borderBottom: '1px solid #f5f5f5',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: subSelected ? '#1677ff' : '#333',
                    background: subSelected ? '#f0f7ff' : undefined,
                  }}
                >
                  {s.name || '未命名菜单'}
                </div>
              )
            })}
            {(item.sub_button?.length ?? 0) < MAX_SUB && (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  addSub(i)
                }}
                style={{ padding: '10px 4px', textAlign: 'center', color: '#999', cursor: 'pointer' }}
              >
                <PlusOutlined />
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                bottom: -5,
                left: '50%',
                marginLeft: -5,
                width: 10,
                height: 10,
                background: '#fff',
                borderRight: '1px solid #e8e8e8',
                borderBottom: '1px solid #e8e8e8',
                transform: 'rotate(45deg)',
              }}
            />
          </div>
        )}
        <div
          onClick={() => {
            if (expanded === i) {
              setExpanded(null)
            } else {
              setExpanded(i)
              setSel({ root: i, sub: null })
            }
          }}
          style={{
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: selected ? '#1677ff' : '#333',
            borderRadius: selected ? 4 : undefined,
            boxShadow: selected ? 'inset 0 0 0 1px #1677ff' : undefined,
          }}
        >
          {item.name || '未命名菜单'}
        </div>
      </div>
    )
  }

  // 右栏编辑面板当前选中项
  const selItem = sel
    ? sel.sub === null
      ? buttons[sel.root]
      : buttons[sel.root]?.sub_button?.[sel.sub]
    : undefined

  return (
    <div>
      {/* 顶部操作栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="选择公众号账号"
            style={{ minWidth: 220 }}
            value={accountId ?? undefined}
            onChange={handleAccountChange}
            options={accounts.map((a) => ({ label: a.name, value: a.id }))}
          />
          <Button disabled={!accountId} loading={menuLoading} onClick={handleLoad}>
            拉取当前菜单
          </Button>
          <Auth perm="mp:menu:edit">
            <Button type="primary" loading={saving} onClick={handleSave}>
              保存并发布到微信
            </Button>
          </Auth>
          <Auth perm="mp:menu:delete">
            <Popconfirm
              title="确认删除该公众号的全部菜单?"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={handleDeleteMenu}
            >
              <Button danger disabled={!accountId}>
                删除菜单
              </Button>
            </Popconfirm>
          </Auth>
        </Space>
      </Card>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
        {/* 左:使用说明 */}
        <Card size="small" title="使用说明" style={{ flex: '0 1 280px', minWidth: 250 }}>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.9, color: 'var(--ant-color-text-secondary)' }}>
            <li>一级菜单最多 {MAX_ROOT} 个,每个一级菜单最多 {MAX_SUB} 个二级菜单</li>
            <li>一级菜单名称 ≤4 个汉字,二级菜单名称 ≤8 个汉字</li>
            <li>无子菜单的一级菜单与所有二级菜单必须填写跳转 URL(http/https)</li>
            <li>发布后微信侧 24 小时内对全部粉丝生效,粉丝取关再关注立即生效</li>
            <li>所有编辑仅保存在本地,点「保存并发布到微信」才生效;「拉取当前菜单」会覆盖本地编辑</li>
          </ul>
        </Card>

        {/* 中:手机壳预览 */}
        <div style={{ flex: '0 1 380px', minWidth: 320 }}>
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              margin: '0 auto',
              borderRadius: 16,
              border: '1px solid #e5e5e5',
              background: '#fff',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,.06)',
            }}
          >
            {/* 绿色聊天头 */}
            <div
              style={{
                background: '#2aae67',
                color: '#fff',
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '0 12px',
              }}
            >
              {selectedAccount ? `${selectedAccount.name} · 公众号` : '公众号'}
            </div>
            {/* 灰底留白区 */}
            <div
              style={{
                height: 300,
                background: '#f2f2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#bbb',
                fontSize: 14,
              }}
            >
              {accountId ? '菜单预览区' : '请先选择公众号账号'}
            </div>
            {/* 底部菜单栏 */}
            <div style={{ borderTop: '1px solid #e5e5e5', background: '#fff', display: 'flex', minHeight: 60 }}>
              {buttons.map((b, i) => renderRootCell(b, i))}
              {buttons.length < MAX_ROOT && (
                <div
                  onClick={addRoot}
                  style={{
                    flex: buttons.length === 0 ? '1 0 100%' : 1,
                    height: 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    color: '#999',
                    borderLeft: buttons.length > 0 ? '1px solid #f0f0f0' : undefined,
                  }}
                >
                  <PlusOutlined />
                  {buttons.length === 0 && <span>新建一级菜单</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右:编辑面板 */}
        <Card size="small" title="菜单项编辑" style={{ flex: '1 1 300px', minWidth: 280 }}>
          {sel && selItem ? (
            (() => {
              const isRoot = sel.sub === null
              const subs = isRoot ? selItem.sub_button ?? [] : []
              const nameMax = isRoot ? 4 : 8
              const nameLen = runeLen(selItem.name)
              const urlBad = !!selItem.url && !URL_PATTERN.test(selItem.url)
              return (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <div style={{ marginBottom: 4 }}>
                      名称(当前 {nameLen} 个字,上限 {nameMax})
                    </div>
                    <Input
                      value={selItem.name}
                      onChange={(e) => patchSel({ name: e.target.value })}
                      placeholder="菜单名称"
                    />
                    {nameLen > nameMax && (
                      <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
                        名称超限:一级菜单 ≤4 个汉字,二级菜单 ≤8 个汉字
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ marginBottom: 4 }}>菜单类型</div>
                    <Input value="跳转网页(view)" disabled />
                  </div>
                  {!isRoot || subs.length === 0 ? (
                    <div>
                      <div style={{ marginBottom: 4 }}>跳转 URL</div>
                      <Input
                        value={selItem.url ?? ''}
                        onChange={(e) => patchSel({ url: e.target.value })}
                        placeholder="https://…"
                      />
                      {urlBad && (
                        <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
                          URL 需以 http:// 或 https:// 开头
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--ant-color-text-tertiary)', fontSize: 12 }}>
                      该一级菜单含子菜单,粉丝点击时展开子菜单面板,无需配置跳转 URL
                    </div>
                  )}
                  {isRoot && subs.length > 0 && (
                    <div style={{ color: 'var(--ant-color-text-tertiary)', fontSize: 12 }}>
                      子菜单顺序可用下方「上移/下移」调整
                    </div>
                  )}
                  <Space wrap>
                    {isRoot && subs.length < MAX_SUB && (
                      <Button icon={<PlusOutlined />} onClick={() => addSub(sel.root)}>
                        添加子菜单
                      </Button>
                    )}
                    <Button danger onClick={removeSel}>
                      删除该项
                    </Button>
                    <Button
                      disabled={(sel.sub === null ? sel.root : sel.sub) === 0}
                      onClick={() => moveSel(-1)}
                    >
                      上移
                    </Button>
                    <Button
                      disabled={
                        (sel.sub === null ? sel.root : sel.sub) ===
                        (sel.sub === null ? buttons.length - 1 : subs.length - 1)
                      }
                      onClick={() => moveSel(1)}
                    >
                      下移
                    </Button>
                  </Space>
                </Space>
              )
            })()
          ) : (
            <Empty
              description="点击中间预览区的菜单项进行编辑;空菜单先点底部「+新建一级菜单」"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
