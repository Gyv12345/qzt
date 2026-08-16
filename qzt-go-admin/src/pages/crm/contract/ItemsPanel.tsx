import { useState } from 'react'
import { App, Button, Form, Popconfirm, Space, Table } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ModalForm, ProFormDigit, ProFormText } from '@ant-design/pro-components'
import {
  createContractItem,
  deleteContractItem,
  updateContractItem,
} from '../../../services/crm'
import type { CrmContract, CrmContractItem } from '../../../types/crm'

interface ItemFormValues {
  product_name: string
  quantity: number
  unit: string
  unit_price: number
  remark: string
}

interface ItemsPanelProps {
  contract: CrmContract
  items: CrmContractItem[]
  loading: boolean
  /** 明细增删改后重新拉取明细列表 */
  onReload: () => void
}

/** 合同详情抽屉的「产品明细」Tab:明细表格 + 新增/编辑明细弹窗 */
export default function ItemsPanel({ contract, items, loading, onReload }: ItemsPanelProps) {
  const { message } = App.useApp()
  const [itemForm] = Form.useForm<ItemFormValues>()
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CrmContractItem | null>(null)

  const handleItemSubmit = async (values: ItemFormValues) => {
    const payload = { product_name: values.product_name, quantity: values.quantity || 1, unit: values.unit, unit_price: values.unit_price || 0, remark: values.remark }
    if (editingItem) {
      await updateContractItem(editingItem.id, payload)
      message.success('明细已更新')
    } else {
      await createContractItem(contract.id, payload)
      message.success('明细已添加')
    }
    onReload()
    return true
  }

  return (
    <>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ textAlign: 'right' }}>
          <Button type="primary" size="small" icon={<PlusOutlined />}
            onClick={() => { setEditingItem(null); itemForm.resetFields(); setItemModalOpen(true) }}>
            新增明细
          </Button>
        </div>
        <Table<CrmContractItem>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={items}
          pagination={false}
          columns={[
            { title: '产品名称', dataIndex: 'product_name' },
            { title: '数量', dataIndex: 'quantity', width: 80, align: 'right' },
            { title: '单位', dataIndex: 'unit', width: 70 },
            { title: '单价', dataIndex: 'unit_price', width: 100, align: 'right', render: (v: string) => `¥${v}` },
            { title: '小计', dataIndex: 'amount', width: 100, align: 'right', render: (v: string) => `¥${v}` },
            { title: '备注', dataIndex: 'remark', ellipsis: true },
            {
              title: '操作', width: 120, render: (_: unknown, r: CrmContractItem) => (
                <Space>
                  <Button type="link" size="small" onClick={() => {
                    setEditingItem(r)
                    itemForm.setFieldsValue({ product_name: r.product_name, quantity: Number(r.quantity), unit: r.unit, unit_price: Number(r.unit_price), remark: r.remark })
                    setItemModalOpen(true)
                  }}>编辑</Button>
                  <Popconfirm title="确认删除?" onConfirm={async () => { await deleteContractItem(r.id); message.success('已删除'); onReload() }}>
                    <Button type="link" size="small" danger>删除</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Space>

      {/* 新增/编辑产品明细 */}
      <ModalForm<ItemFormValues>
        title={editingItem ? '编辑明细' : '新增明细'}
        form={itemForm}
        open={itemModalOpen}
        onOpenChange={setItemModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleItemSubmit}
        width={640}
        grid
      >
        <ProFormText name="product_name" label="产品名称" rules={[{ required: true, message: '请输入产品名称' }]} colProps={{ span: 24 }} />
        <ProFormDigit name="quantity" label="数量" min={0} fieldProps={{ precision: 2 }} colProps={{ span: 8 }} />
        <ProFormText name="unit" label="单位" placeholder="如 套/个/月" colProps={{ span: 4 }} />
        <ProFormDigit name="unit_price" label="单价" min={0} fieldProps={{ precision: 2 }} colProps={{ span: 6 }} />
        <ProFormText name="remark" label="备注" colProps={{ span: 6 }} />
      </ModalForm>
    </>
  )
}
