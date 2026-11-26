import { useEffect, useState } from 'react'
import { Descriptions, Drawer, Empty, Spin, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useUserStore } from '../../../stores/users'
import { listAssetDepreciationLogs } from '../../../services/psi'
import { ASSET_STATUS, type PsiAsset, type PsiDepreciationLog } from '../../../types/psi'

interface DepreciationDrawerProps {
  open: boolean
  asset: PsiAsset | null
  onClose: () => void
}

/** 资产折旧记录抽屉(P33):期间/本期计提/期初累计/期末累计 */
export default function DepreciationDrawer({ open, asset, onClose }: DepreciationDrawerProps) {
  const nickname = useUserStore((s) => s.nickname)
  const [logs, setLogs] = useState<PsiDepreciationLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !asset) return
    setLoading(true)
    listAssetDepreciationLogs(asset.id)
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [open, asset])

  const columns: ColumnsType<PsiDepreciationLog> = [
    { title: '期间', dataIndex: 'period', width: 100, render: (_, r) => <Tag color="blue">{r.period}</Tag> },
    { title: '本期计提', dataIndex: 'amount', width: 120, align: 'right', render: (_, r) => `¥${r.amount}` },
    { title: '期初累计折旧', dataIndex: 'before_depreciation', width: 130, align: 'right', render: (_, r) => `¥${r.before_depreciation}` },
    { title: '期末累计折旧', dataIndex: 'after_depreciation', width: 130, align: 'right', render: (_, r) => `¥${r.after_depreciation}` },
    { title: '计提时间', dataIndex: 'created_at', width: 170, render: (_, r) => r.created_at || '-' },
  ]

  const statusInfo = asset ? ASSET_STATUS[asset.status] : undefined

  return (
    <Drawer
      width={760}
      open={open}
      onClose={onClose}
      title={asset ? `折旧记录:${asset.asset_no} ${asset.name}` : '折旧记录'}
      destroyOnHidden
    >
      {asset && (
        <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="资产编号">{asset.asset_no}</Descriptions.Item>
          <Descriptions.Item label="资产名称">{asset.name}</Descriptions.Item>
          <Descriptions.Item label="状态">
            {statusInfo ? <Tag color={statusInfo.color}>{statusInfo.text}</Tag> : asset.status}
          </Descriptions.Item>
          <Descriptions.Item label="归属人">{nickname(asset.owner_id)}</Descriptions.Item>
          <Descriptions.Item label="采购价">{asset.purchase_price ? `¥${asset.purchase_price}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="累计折旧">{asset.depreciation ? `¥${asset.depreciation}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="净值">{asset.net_value ? `¥${asset.net_value}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="使用年限">{asset.useful_life ? `${asset.useful_life} 月` : '-'}</Descriptions.Item>
        </Descriptions>
      )}

      {loading ? (
        <Spin style={{ display: 'block', margin: '40px auto' }} />
      ) : logs.length === 0 ? (
        <Empty description="暂无折旧记录(可通过工具栏手动计提)" />
      ) : (
        <Table<PsiDepreciationLog>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={logs}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      )}
    </Drawer>
  )
}
