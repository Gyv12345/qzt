import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteAsset, listAssets } from '../../../services/psi'
import { ASSET_STATUS, type PsiAsset } from '../../../types/psi'
import AssetEditModal from './EditModal'

export default function AssetPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    await deleteAsset(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<PsiAsset>[] = [
    { title: '编号', valueType: 'indexBorder', width: 60 },
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
      title: '操作', valueType: 'option', width: 140, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="psi:asset:edit">
            <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>编辑</Button>
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
          <Auth perm="psi:asset:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); setEditOpen(true) }}>新增资产</Button>
          </Auth>,
        ]}
        headerTitle="固定资产"
      />
      <AssetEditModal open={editOpen} editingId={editingId} onOpenChange={setEditOpen} onSuccess={() => actionRef.current?.reload()} />
    </>
  )
}
