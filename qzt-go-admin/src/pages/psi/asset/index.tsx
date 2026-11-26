import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteAsset, listAssets, runAssetDepreciation } from '../../../services/psi'
import { ASSET_STATUS, type PsiAsset } from '../../../types/psi'
import AssetEditModal from './EditModal'
import DepreciationDrawer from './DepreciationDrawer'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function AssetPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  // 折旧记录抽屉(P33)
  const [depOpen, setDepOpen] = useState(false)
  const [depAsset, setDepAsset] = useState<PsiAsset | null>(null)
  const [depreciating, setDepreciating] = useState(false)

  const handleDelete = async (id: number) => {
    await deleteAsset(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  /** 手动计提折旧(直线法,按当前月;重复执行幂等跳过) */
  const handleDepreciate = async () => {
    setDepreciating(true)
    try {
      const res = await runAssetDepreciation()
      message.success(`计提完成:本次处理 ${res.count} 项资产,合计计提 ¥${res.total_amount}`)
      actionRef.current?.reload()
    } finally {
      setDepreciating(false)
    }
  }

  const columns: ProColumns<PsiAsset>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '资产编号', dataIndex: 'asset_no', width: 140 },
    { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
    { title: '类别', dataIndex: 'category', width: 80 },
    { title: '规格', dataIndex: 'spec', width: 120, ellipsis: true, search: false },
    { title: 'SN码', dataIndex: 'serial_no', width: 120, ellipsis: true, search: false },
    { title: '采购价', dataIndex: 'purchase_price', width: 90, search: false, render: (_, r) => r.purchase_price ? `¥${r.purchase_price}` : '-' },
    { title: '净值', dataIndex: 'net_value', width: 90, search: false, render: (_, r) => r.net_value ? `¥${r.net_value}` : '-' },
    {
      title: '状态', dataIndex: 'status', width: 90,
      valueType: 'select',
      valueEnum: Object.fromEntries(Object.entries(ASSET_STATUS).map(([k, v]) => [k, { text: v.text }])),
      render: (_, r) => { const s = ASSET_STATUS[r.status] || ASSET_STATUS[1]; return <Tag color={s.color}>{s.text}</Tag> },
    },
    { title: '位置', dataIndex: 'location', width: 120, ellipsis: true, search: false },
    {
      title: '操作', valueType: 'option', width: 190, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="psi:asset:edit">
            <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>编辑</Button>
          </Auth>
          <Auth perm="psi:asset:list">
            <Button type="link" size="small" onClick={() => { setDepAsset(record); setDepOpen(true) }}>折旧记录</Button>
          </Auth>
          <Auth perm="psi:asset:delete">
            <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<PsiAsset>
        rowKey="id" actionRef={actionRef} columns={columns} scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listAssets({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="psi:asset:depreciate" key="depreciate">
            <Popconfirm
              title="手动计提折旧"
              description="按当前月对启用资产直线法计提;重复执行幂等跳过。确认计提?"
              okText="计提"
              cancelText="取消"
              onConfirm={() => handleDepreciate()}
            >
              <Button loading={depreciating}>手动计提折旧</Button>
            </Popconfirm>
          </Auth>,
          <Auth perm="psi:asset:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); setEditOpen(true) }}>新增资产</Button>
          </Auth>,
        ]}
        headerTitle="固定资产"
      />
      <AssetEditModal open={editOpen} editingId={editingId} onOpenChange={setEditOpen} onSuccess={() => actionRef.current?.reload()} />
      <DepreciationDrawer open={depOpen} asset={depAsset} onClose={() => setDepOpen(false)} />
    </>
  )
}
