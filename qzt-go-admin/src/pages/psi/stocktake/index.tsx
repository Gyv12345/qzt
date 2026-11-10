import { useEffect, useRef, useState } from 'react'
import { App, Button, Drawer, Descriptions, Form, InputNumber, Space, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormSelect,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { listProducts } from '../../../services/crm'
import {
  cancelStocktakeOrder,
  confirmStocktakeOrder,
  createStocktakeOrder,
  deleteStocktakeOrder,
  getStocktakeOrder,
  listEnabledWarehouses,
  listStocktakeOrders,
  updateStocktakeActual,
} from '../../../services/psi'
import type {
  PsiStocktake,
  PsiStocktakeDetail,
  PsiStocktakeItem,
} from '../../../types/psi'
import { STOCKTAKE_STATUS } from '../../../types/psi'
import { pageIndexColumn } from '../../../components/IndexTag'

const STATUS = STOCKTAKE_STATUS

interface CreateFormValues {
  warehouse_id: number
  remark?: string
}

/** 库存盘点:列表 + 新增(冻结快照) + 详情(录实盘/确认/作废/删除) */
export default function StocktakePage() {
  const { message, modal } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<CreateFormValues>()
  const [createOpen, setCreateOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detail, setDetail] = useState<PsiStocktakeDetail | null>(null)
  // 实盘录入行缓存(item_id -> 实盘数)
  const [actualDraft, setActualDraft] = useState<Record<number, number | null>>({})
  const [warehouses, setWarehouses] = useState<{ label: string; value: number }[]>([])
  const [productMap, setProductMap] = useState<Map<number, string>>(new Map())

  useEffect(() => {
    listEnabledWarehouses().then((ws) =>
      setWarehouses(ws.map((w) => ({ label: w.name, value: w.id }))),
    )
    listProducts({ page: 1, page_size: 100 }).then((res) =>
      setProductMap(new Map(res.list.map((p) => [p.id, p.name]))),
    )
  }, [])

  const reloadDetail = (id: number) =>
    getStocktakeOrder(id).then((d) => {
      setDetail(d)
      const draft: Record<number, number | null> = {}
      for (const it of d.items ?? []) {
        draft[it.id] = it.actual_qty != null ? Number(it.actual_qty) : null
      }
      setActualDraft(draft)
    })

  const openDetail = (record: PsiStocktake) => {
    setDrawerOpen(true)
    reloadDetail(record.id).catch(() => {})
  }

  const handleCreate = async (values: CreateFormValues) => {
    await createStocktakeOrder({ warehouse_id: values.warehouse_id, remark: values.remark || undefined })
    message.success('盘点单已创建,账面快照已冻结')
    actionRef.current?.reload()
    return true
  }

  const withConfirm = (title: string, content: string, run: () => Promise<unknown>) => {
    modal.confirm({
      title,
      content,
      okText: '确认',
      cancelText: '取消',
      onOk: run,
    })
  }

  const handleConfirmStocktake = (record: PsiStocktake) => {
    withConfirm('确认盘点', '将按差异派生盘盈/盘亏库存流水,确认后不可撤销。继续?', async () => {
      await confirmStocktakeOrder(record.id)
      message.success('盘点已确认')
      actionRef.current?.reload()
      if (drawerOpen && detail?.id === record.id) await reloadDetail(record.id)
    })
  }

  const handleCancel = (record: PsiStocktake) => {
    withConfirm('作废盘点', '作废不产生任何库存变动,作废后可删除。继续?', async () => {
      await cancelStocktakeOrder(record.id)
      message.success('已作废')
      actionRef.current?.reload()
    })
  }

  const handleDelete = (record: PsiStocktake) => {
    withConfirm('删除盘点单', '仅已作废的单可删除。继续?', async () => {
      await deleteStocktakeOrder(record.id)
      message.success('已删除')
      actionRef.current?.reload()
    })
  }

  const handleSaveActual = async () => {
    if (!detail) return
    const items = (detail.items ?? [])
      .filter((it) => actualDraft[it.id] != null)
      .map((it) => ({ item_id: it.id, actual_qty: Number(actualDraft[it.id]) }))
    if (items.length === 0) {
      message.warning('请至少填写一条实盘数')
      return
    }
    await updateStocktakeActual(detail.id, { items })
    message.success('实盘数已保存')
    await reloadDetail(detail.id)
  }

  const columns: ProColumns<PsiStocktake>[] = [
    pageIndexColumn(actionRef),
    { title: '盘点单号', dataIndex: 'stocktake_no', width: 180, search: false },
    {
      title: '仓库',
      dataIndex: 'warehouse_id',
      width: 130,
      valueType: 'select',
      fieldProps: { allowClear: true, placeholder: '选择仓库', options: warehouses },
      render: (_, r) => r.warehouse_name ?? `#${r.warehouse_id}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      fieldProps: {
        allowClear: true,
        placeholder: '选择状态',
        options: Object.entries(STATUS).map(([v, s]) => ({ label: s.text, value: Number(v) })),
      },
      render: (_, r) => {
        const s = STATUS[r.status]
        return s ? <Tag color={s.color}>{s.text}</Tag> : r.status
      },
    },
    { title: '盘点日期', dataIndex: 'take_date', valueType: 'dateTime', width: 150, search: false },
    { title: '确认时间', dataIndex: 'confirm_time', valueType: 'dateTime', width: 150, search: false },
    { title: '备注', dataIndex: 'remark', width: 150, search: false, ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" onClick={() => openDetail(r)}>
            详情
          </Button>
          {r.status === 1 && (
            <Auth perm="psi:stocktake:confirm">
              <Button type="link" size="small" onClick={() => handleConfirmStocktake(r)}>
                确认
              </Button>
            </Auth>
          )}
          {r.status === 1 && (
            <Auth perm="psi:stocktake:cancel">
              <Button type="link" size="small" danger onClick={() => handleCancel(r)}>
                作废
              </Button>
            </Auth>
          )}
          {r.status === 3 && (
            <Auth perm="psi:stocktake:delete">
              <Button type="link" size="small" danger onClick={() => handleDelete(r)}>
                删除
              </Button>
            </Auth>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<PsiStocktake>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listStocktakeOrders({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="psi:stocktake:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              form.resetFields()
              setCreateOpen(true)
            }}>
              发起盘点
            </Button>
          </Auth>,
        ]}
        headerTitle="库存盘点"
      />
      <ModalForm<CreateFormValues>
        title="发起盘点(创建即冻结该仓账面快照)"
        form={form}
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleCreate}
        width={480}
      >
        <ProFormSelect
          name="warehouse_id"
          label="盘点仓库"
          rules={[{ required: true, message: '请选择仓库' }]}
          options={warehouses}
          placeholder="选择仓库(同仓同时仅允许一张盘点中的单)"
        />
        <ProFormTextArea name="remark" label="备注" fieldProps={{ rows: 3 }} />
      </ModalForm>
      <StocktakeDetailDrawer
        open={drawerOpen}
        detail={detail}
        actualDraft={actualDraft}
        setActualDraft={setActualDraft}
        productMap={productMap}
        onClose={() => setDrawerOpen(false)}
        onSaveActual={handleSaveActual}
      />
    </>
  )
}

/** 详情抽屉:基本信息 + 明细(盘点中可录实盘,已确认展示差异) */
function StocktakeDetailDrawer({
  open,
  detail,
  actualDraft,
  setActualDraft,
  productMap,
  onClose,
  onSaveActual,
}: {
  open: boolean
  detail: PsiStocktakeDetail | null
  actualDraft: Record<number, number | null>
  setActualDraft: (v: Record<number, number | null>) => void
  productMap: Map<number, string>
  onClose: () => void
  onSaveActual: () => Promise<void>
}) {
  const s = detail ? STOCKTAKE_STATUS[detail.status] : undefined
  const ongoing = detail?.status === 1
  const itemColumns = [
    { title: '商品', dataIndex: 'product_id', width: 160, render: (v: number) => productMap.get(v) ?? `#${v}` },
    { title: '规格', dataIndex: 'sku_spec', width: 110, render: (v?: string) => v || '默认规格' },
    { title: '账面数量', dataIndex: 'expected_qty', width: 100 },
    {
      title: '实盘数量',
      dataIndex: 'actual_qty',
      width: 120,
      render: (_: unknown, it: PsiStocktakeItem) =>
        ongoing ? (
          <InputNumber
            min={0}
            value={actualDraft[it.id] ?? undefined}
            onChange={(v) => setActualDraft({ ...actualDraft, [it.id]: v })}
            placeholder="未盘"
            style={{ width: '100%' }}
          />
        ) : (
          it.actual_qty ?? <span style={{ color: '#999' }}>未盘</span>
        ),
    },
    { title: '差异', dataIndex: 'diff_qty', width: 90 },
    { title: '备注', dataIndex: 'remark' },
  ]
  return (
    <Drawer
      width={860}
      open={open}
      onClose={onClose}
      title={detail ? `盘点详情:${detail.stocktake_no}` : '盘点详情'}
    >
      {detail && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="盘点单号">{detail.stocktake_no}</Descriptions.Item>
            <Descriptions.Item label="仓库">
              {detail.warehouse_name ?? `#${detail.warehouse_id}`}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {s ? <Tag color={s.color}>{s.text}</Tag> : detail.status}
            </Descriptions.Item>
            <Descriptions.Item label="盘点日期">{detail.take_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="确认时间">{detail.confirm_time || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注">{detail.remark || '-'}</Descriptions.Item>
          </Descriptions>
          <Table<PsiStocktakeItem>
            rowKey="id"
            size="small"
            columns={itemColumns}
            dataSource={detail.items ?? []}
            pagination={false}
          />
          {ongoing && (
            <Button type="primary" onClick={() => void onSaveActual()}>
              保存实盘数
            </Button>
          )}
        </Space>
      )}
    </Drawer>
  )
}
