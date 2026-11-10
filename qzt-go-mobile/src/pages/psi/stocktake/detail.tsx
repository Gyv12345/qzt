import { useEffect, useState } from 'react'
import { Button, Card, Dialog, ErrorBlock, Input, List, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import {
  cancelStocktakeOrder,
  confirmStocktakeOrder,
  deleteStocktakeOrder,
  getStocktakeOrder,
  saveStocktakeActual,
} from '../../../services/psi'
import type { PsiStocktakeDetail } from '../../../types/psi'
import { STOCKTAKE_STATUS } from '../../../types/psi'

/** 盘点详情(移动端 P15):明细录实盘 + 确认/作废/删除 */
export default function StocktakeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<PsiStocktakeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [acting, setActing] = useState(false)
  // 实盘录入草稿(item_id -> 实盘数)
  const [draft, setDraft] = useState<Record<number, string>>({})

  const load = () => {
    if (!id) return
    setLoading(true)
    getStocktakeOrder(Number(id))
      .then((d) => {
        setDetail(d)
        const init: Record<number, string> = {}
        for (const it of d.items ?? []) {
          init[it.id] = it.actual_qty != null ? String(Number(it.actual_qty)) : ''
        }
        setDraft(init)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  if (loading) {
    return (
      <div style={{ paddingTop: '40vh', textAlign: 'center' }}>
        <SpinLoading style={{ '--size': '40px' }} />
      </div>
    )
  }
  if (error || !detail) {
    return <ErrorBlock status="default" title="加载失败" description="盘点单不存在或无权限" />
  }

  const ongoing = detail.status === 1
  const s = STOCKTAKE_STATUS[detail.status] || STOCKTAKE_STATUS[1]

  const doSaveActual = async () => {
    const items = Object.entries(draft)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => ({ item_id: Number(k), actual_qty: Number(v) }))
    if (items.length === 0) {
      Dialog.alert({ content: '请至少填写一条实盘数' })
      return
    }
    setActing(true)
    try {
      await saveStocktakeActual(detail.id, items)
      Dialog.alert({ content: '实盘数已保存' })
      load()
    } finally {
      setActing(false)
    }
  }

  const withConfirm = (title: string, run: () => Promise<void>) => {
    Dialog.confirm({
      title,
      onConfirm: async () => {
        setActing(true)
        try {
          await run()
        } finally {
          setActing(false)
        }
      },
    })
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 96 }}>
      <NavBar onBack={() => navigate(-1)} right={<Tag color={s.color} fill="outline">{s.text}</Tag>}>
        {detail.stocktake_no}
      </NavBar>

      <Card title="基本信息" style={{ margin: 8 }}>
        <List>
          <List.Item extra={detail.warehouse_name || `#${detail.warehouse_id}`}>仓库</List.Item>
          <List.Item extra={detail.take_date ? detail.take_date.slice(0, 16) : '-'}>盘点时间</List.Item>
          {detail.remark && <List.Item extra={detail.remark}>说明</List.Item>}
        </List>
      </Card>

      <Card title={`盘点明细(${(detail.items ?? []).length} 行,账面快照)`} style={{ margin: 8 }}>
        <List>
          {(detail.items ?? []).map((it) => (
            <List.Item
              key={it.id}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  账面 {Number(it.expected_qty)} · 差异 {Number(it.diff_qty)}
                </span>
              }
              extra={
                ongoing ? (
                  <Input
                    style={{ width: 88, textAlign: 'right' }}
                    type="number"
                    placeholder="未盘"
                    value={draft[it.id] ?? ''}
                    onChange={(v) => setDraft((prev) => ({ ...prev, [it.id]: v }))}
                  />
                ) : (
                  <span>{it.actual_qty != null ? Number(it.actual_qty) : '未盘'}</span>
                )
              }
            >
              {it.sku_spec ? `${it.sku_spec}` : `商品#${it.product_id}`}
            </List.Item>
          ))}
        </List>
      </Card>

      {ongoing && (
        <div style={{ padding: 12, display: 'flex', gap: 8 }}>
          <Button block color="primary" loading={acting} onClick={doSaveActual}>
            保存实盘
          </Button>
          <Button
            block
            color="success"
            fill="outline"
            loading={acting}
            onClick={() =>
              withConfirm('确认盘点?', async () => {
                await confirmStocktakeOrder(detail.id)
                Dialog.alert({ content: '盘点已确认,差异已生成盘盈/盘亏流水' })
                load()
              })
            }
          >
            确认
          </Button>
          <Button
            block
            color="danger"
            fill="none"
            loading={acting}
            onClick={() =>
              withConfirm('作废盘点?', async () => {
                await cancelStocktakeOrder(detail.id)
                Dialog.alert({ content: '已作废' })
                load()
              })
            }
          >
            作废
          </Button>
        </div>
      )}
      {detail.status === 3 && (
        <div style={{ padding: 12 }}>
          <Button
            block
            color="danger"
            fill="outline"
            loading={acting}
            onClick={() =>
              withConfirm('删除盘点单?', async () => {
                await deleteStocktakeOrder(detail.id)
                navigate(-1)
              })
            }
          >
            删除
          </Button>
        </div>
      )}
    </div>
  )
}
