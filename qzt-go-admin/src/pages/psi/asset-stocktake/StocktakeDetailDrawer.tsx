import { useCallback, useEffect, useState } from 'react'
import { App, Button, Descriptions, Drawer, Input, Popconfirm, Progress, Radio, Space, Spin, Table, Tag } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import Auth, { usePerm } from '../../../components/Auth'
import { useUserStore } from '../../../stores/users'
import { finishAssetStocktake, getAssetStocktake, updateAssetStocktakeItem } from '../../../services/psi'
import {
  ASSET_CHECK_RESULT,
  ASSET_STATUS,
  ASSET_STOCKTAKE_SCOPES,
  ASSET_STOCKTAKE_STATUS,
  type PsiAssetStocktakeDetail,
  type PsiAssetStocktakeItem,
} from '../../../types/psi'

interface DetailDrawerProps {
  open: boolean
  stocktakeId: number | null
  deptName: (v?: string | null) => string | undefined
  onClose: () => void
  /** 变更后回调(列表刷新) */
  onChanged: () => void
}

/** 行内编辑草稿(itemId -> 结果/备注) */
interface RowDraft {
  status: 1 | 2 | 3 | null
  remark: string
}

const RESULT_OPTIONS = Object.entries(ASSET_CHECK_RESULT).map(([v, s]) => ({ label: s.text, value: Number(v) }))

/** 资产盘点详情抽屉:头信息 + 进度 + 明细填报(结果/备注行内编辑) + 完成盘点 */
export default function AssetStocktakeDetailDrawer({ open, stocktakeId, deptName, onClose, onChanged }: DetailDrawerProps) {
  const { message, modal } = App.useApp()
  const nickname = useUserStore((s) => s.nickname)
  const hasPerm = usePerm()
  const canItem = hasPerm('psi:asset-stocktake:item')
  const [detail, setDetail] = useState<PsiAssetStocktakeDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Record<number, RowDraft>>({})

  const reload = useCallback(() => {
    if (!stocktakeId) return
    setLoading(true)
    getAssetStocktake(stocktakeId)
      .then((d) => {
        setDetail(d)
        const next: Record<number, RowDraft> = {}
        for (const it of d.items ?? []) {
          next[it.id] = {
            status: (it.result_status as 1 | 2 | 3 | null) ?? null,
            remark: it.result_remark || '',
          }
        }
        setDraft(next)
      })
      .finally(() => setLoading(false))
  }, [stocktakeId])

  useEffect(() => {
    if (open && stocktakeId) reload()
    if (!open) setDetail(null)
  }, [open, stocktakeId, reload])

  const saveItem = async (item: PsiAssetStocktakeItem, d: RowDraft) => {
    if (!detail || d.status == null) return
    setSavingId(item.id)
    try {
      await updateAssetStocktakeItem(detail.id, item.id, {
        result_status: d.status,
        result_remark: d.remark || undefined,
      })
      message.success(`已记录:${item.asset_no}`)
      reload()
      onChanged()
    } finally {
      setSavingId(null)
    }
  }

  const patchDraft = (id: number, patch: Partial<RowDraft>) => {
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const scopeText = () => {
    if (!detail) return '-'
    const base = ASSET_STOCKTAKE_SCOPES[detail.scope_type] || detail.scope_type
    if (detail.scope_type === 'all') return base
    if (detail.scope_type === 'category') return `${base}·${detail.scope_value}`
    return `${base}·${deptName(detail.scope_value) ?? detail.scope_value}`
  }

  const total = Number(detail?.total_count) || 0
  const checked = Number(detail?.checked_count) || 0
  const unchecked = Math.max(0, total - checked)
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0
  const ongoing = detail?.status === 1

  const handleFinish = async () => {
    if (!detail) return
    const res = await finishAssetStocktake(detail.id)
    modal.success({
      title: '盘点已完成',
      content: (
        <Descriptions column={1} size="small" style={{ marginTop: 8 }}>
          <Descriptions.Item label="盘点总数">{res.total}</Descriptions.Item>
          <Descriptions.Item label="在库">{res.in_stock}</Descriptions.Item>
          <Descriptions.Item label="缺失">{res.missing}</Descriptions.Item>
          <Descriptions.Item label="损坏">{res.damaged}</Descriptions.Item>
        </Descriptions>
      ),
      okText: '知道了',
    })
    reload()
    onChanged()
  }

  const itemColumns: ColumnsType<PsiAssetStocktakeItem> = [
    { title: '资产编号', dataIndex: 'asset_no', width: 140 },
    { title: '资产名称', dataIndex: 'asset_name', width: 160, ellipsis: true },
    {
      title: '盘点时状态',
      dataIndex: 'expected_status',
      width: 100,
      render: (_, it) => {
        const s = ASSET_STATUS[it.expected_status]
        return s ? <Tag color={s.color}>{s.text}</Tag> : it.expected_status
      },
    },
    {
      title: '盘点结果',
      dataIndex: 'result_status',
      width: 210,
      render: (_, it) => {
        const value = ongoing && canItem ? draft[it.id]?.status ?? it.result_status : it.result_status
        const editable = ongoing && canItem
        if (!editable) {
          const s = it.result_status != null ? ASSET_CHECK_RESULT[it.result_status] : null
          return s ? <Tag color={s.color}>{s.text}</Tag> : <span style={{ color: 'var(--ant-color-text-tertiary)' }}>未盘</span>
        }
        return (
          <Radio.Group
            size="small"
            options={RESULT_OPTIONS}
            value={value ?? undefined}
            onChange={(e) => {
              const next = e.target.value as 1 | 2 | 3
              patchDraft(it.id, { status: next })
              void saveItem(it, { ...(draft[it.id] ?? { remark: it.result_remark || '', status: null }), status: next })
            }}
          />
        )
      },
    },
    {
      title: '备注',
      dataIndex: 'result_remark',
      width: 220,
      render: (_, it) => {
        if (!(ongoing && canItem)) return it.result_remark || '-'
        return (
          <Space.Compact style={{ width: '100%' }}>
            <Input
              size="small"
              placeholder="备注(选填)"
              value={draft[it.id]?.remark ?? ''}
              onChange={(e) => patchDraft(it.id, { remark: e.target.value })}
              onPressEnter={() => {
                const d = draft[it.id]
                if (d?.status != null && (d.remark || '') !== (it.result_remark || '')) void saveItem(it, d)
              }}
            />
            <Button
              size="small"
              icon={<SaveOutlined />}
              loading={savingId === it.id}
              disabled={draft[it.id]?.status == null}
              onClick={() => {
                const d = draft[it.id]
                if (d?.status != null) void saveItem(it, d)
              }}
            />
          </Space.Compact>
        )
      },
    },
    { title: '填报人', dataIndex: 'checked_by', width: 100, render: (_, it) => nickname(it.checked_by) },
    { title: '填报时间', dataIndex: 'checked_at', width: 160, render: (_, it) => it.checked_at || '-' },
  ]

  const statusInfo = detail ? ASSET_STOCKTAKE_STATUS[detail.status] : undefined

  return (
    <Drawer
      width={980}
      open={open}
      onClose={onClose}
      title={detail ? `盘点详情:${detail.stocktake_no}` : '盘点详情'}
      destroyOnHidden
    >
      {loading && !detail ? (
        <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>
      ) : detail ? (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Descriptions column={3} bordered size="small">
            <Descriptions.Item label="盘点单号">{detail.stocktake_no}</Descriptions.Item>
            <Descriptions.Item label="盘点范围">{scopeText()}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {statusInfo ? <Tag color={statusInfo.color}>{statusInfo.text}</Tag> : detail.status}
            </Descriptions.Item>
            <Descriptions.Item label="盘点时间">{detail.stocktake_at || '-'}</Descriptions.Item>
            <Descriptions.Item label="完成时间">{detail.finished_at || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注">{detail.remark || '-'}</Descriptions.Item>
          </Descriptions>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <Progress
                percent={percent}
                status={ongoing ? 'active' : 'normal'}
                format={() => `${checked}/${total} 项`}
              />
            </div>
            {ongoing && (
              <Auth perm="psi:asset-stocktake:finish">
                <Popconfirm
                  title="确认完成盘点?"
                  description={
                    unchecked > 0
                      ? `仍有 ${unchecked} 项未盘,未盘项将不计入差异统计。确认完成?`
                      : '完成后将生成差异统计并同步资产状态,确认完成?'
                  }
                  okText="完成盘点"
                  cancelText="取消"
                  onConfirm={() => void handleFinish()}
                >
                  <Button type="primary">完成盘点</Button>
                </Popconfirm>
              </Auth>
            )}
          </div>

          <Table<PsiAssetStocktakeItem>
            rowKey="id"
            size="small"
            columns={itemColumns}
            dataSource={detail.items ?? []}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </Space>
      ) : (
        <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--ant-color-text-tertiary)' }}>无数据</div>
      )}
    </Drawer>
  )
}
