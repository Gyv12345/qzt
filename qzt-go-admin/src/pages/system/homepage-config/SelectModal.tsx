import { useState } from 'react'
import { App, Modal } from 'antd'
import { ProTable, type ProColumns } from '@ant-design/pro-components'
import { listCustomers, listProducts } from '../../../services/crm'
import { listUsers, syncHomepageFeatures } from '../../../services/system'

export type ModuleKey = 'product' | 'partner' | 'team'

interface SelectModalProps {
  open: boolean
  module: ModuleKey
  moduleName: string
  selectedIds: number[]
  onCancel: () => void
  onSuccess: () => void
}

interface SelectableItem {
  id: number
  name: string
  sub_info: string
}

const MODULE_TITLE: Record<ModuleKey, string> = {
  product: '产品',
  partner: '合作伙伴',
  team: '团队成员',
}

export default function SelectModal({
  open,
  module,
  moduleName,
  selectedIds,
  onCancel,
  onSuccess,
}: SelectModalProps) {
  const { message } = App.useApp()
  const [selected, setSelected] = useState<number[]>(selectedIds)

  // 每次 open 变化时重置选中
  const handleClose = () => {
    setSelected([])
    onCancel()
  }

  const handleOpenChange = (visible: boolean) => {
    if (visible) {
      setSelected(selectedIds)
    }
  }

  const handleSubmit = async () => {
    if (selected.length === 0) {
      message.warning('请至少选择一项')
      return
    }
    await syncHomepageFeatures(module, selected)
    message.success('精选已更新')
    setSelected([])
    onSuccess()
  }

  // 根据 module 查不同数据源
  const request = async (params: {
    current?: number
    pageSize?: number
    keyword?: string
  }): Promise<{ data: SelectableItem[]; total: number; success: boolean }> => {
    const page = params.current || 1
    const pageSize = params.pageSize || 10
    try {
      if (module === 'product') {
        const res = await listProducts({ page, page_size: pageSize, keyword: params.keyword })
        return {
          data: res.list.map((p) => ({
            id: p.id,
            name: p.name,
            sub_info: p.category || p.product_no || '',
          })),
          total: res.total,
          success: true,
        }
      }
      if (module === 'partner') {
        const res = await listCustomers({ page, page_size: pageSize, keyword: params.keyword })
        return {
          data: res.list.map((c) => ({
            id: c.id,
            name: c.name,
            sub_info: [c.level && `级别:${c.level}`, c.industry && `行业:${c.industry}`]
              .filter(Boolean)
              .join(' / '),
          })),
          total: res.total,
          success: true,
        }
      }
      // team
      const res = await listUsers({ page, page_size: pageSize })
      return {
        data: res.list.map((u) => ({
          id: u.id,
          name: u.nickname || u.username,
          sub_info: u.username,
        })),
        total: res.total,
        success: true,
      }
    } catch {
      return { data: [], total: 0, success: false }
    }
  }

  const columns: ProColumns<SelectableItem>[] = [
    { title: '名称', dataIndex: 'name', width: 220, search: false },
    { title: '补充信息', dataIndex: 'sub_info', width: 220, search: false },
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '搜索名称' },
    },
  ]

  return (
    <Modal
      title={`选择展示${MODULE_TITLE[module]} — ${moduleName}`}
      open={open}
      width={900}
      onOk={handleSubmit}
      onCancel={handleClose}
      afterOpenChange={handleOpenChange}
      destroyOnHidden
      okText={`确定（已选 ${selected.length}）`}
    >
      <ProTable<SelectableItem>
        rowKey="id"
        columns={columns}
        scroll={{ x: 600 }}
        search={{ labelWidth: 80 }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        request={request}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => setSelected(keys as number[]),
        }}
        toolBarRender={false}
        options={false}
      />
    </Modal>
  )
}
