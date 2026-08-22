import { useCallback, useEffect, useState } from 'react'
import {
  App,
  Button,
  Drawer,
  Form,
  Image,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ModalForm, ProFormText } from '@ant-design/pro-components'
import ImageUpload from '../../../components/ImageUpload'
import {
  createProductSku,
  deleteProductSku,
  listProductSkus,
  updateProductSku,
} from '../../../services/crm'
import type {
  CrmProduct,
  CrmProductSku,
  CrmProductSkuPayload,
} from '../../../types/crm'

interface SkuDrawerProps {
  product: CrmProduct | null
  open: boolean
  onClose: () => void
}

interface SkuFormValues {
  spec?: string
  sku_no?: string
  price?: number
  cost_price?: number
  image_url?: string
}

/**
 * 商品规格 SKU 管理抽屉。
 * 单规格商品只有一条「默认规格」(随商品价格自动同步),无需手工维护;
 * 需要按规格(颜色/尺码/型号)分别定价、管库存时在此新增规格。
 */
export default function SkuDrawer({ product, open, onClose }: SkuDrawerProps) {
  const { message } = App.useApp()
  const [list, setList] = useState<CrmProductSku[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmProductSku | null>(null)
  const [form] = Form.useForm<SkuFormValues>()

  const load = useCallback(async () => {
    if (!product) return
    setLoading(true)
    try {
      const res = await listProductSkus(product.id)
      setList(res.list || [])
    } finally {
      setLoading(false)
    }
  }, [product])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: CrmProductSku) => {
    setEditing(record)
    form.setFieldsValue({
      spec: record.spec || undefined,
      sku_no: record.sku_no || undefined,
      price: record.price ? Number(record.price) : undefined,
      cost_price: record.cost_price ? Number(record.cost_price) : undefined,
      image_url: record.image_url || undefined,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: SkuFormValues) => {
    if (!product) return false
    const payload: CrmProductSkuPayload = {
      spec: values.spec?.trim() || '',
      sku_no: values.sku_no?.trim() || undefined,
      price: values.price,
      cost_price: values.cost_price,
      image_url: values.image_url,
    }
    if (editing) {
      await updateProductSku(product.id, editing.id, payload)
      message.success('规格已更新')
    } else {
      await createProductSku(product.id, payload)
      message.success('规格已新增')
    }
    void load()
    return true
  }

  const handleDelete = async (record: CrmProductSku) => {
    if (!product) return
    await deleteProductSku(product.id, record.id)
    message.success('规格已删除')
    void load()
  }

  const isSingleSpec = list.length === 1 && list[0].spec === ''

  return (
    <Drawer
      title={product ? `规格管理 — ${product.name}` : '规格管理'}
      width={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {isSingleSpec
          ? '当前为单规格商品,「默认规格」的价格随产品主表自动同步。需要按颜色/尺码/型号分别定价和管库存时,点击下方「新增规格」。'
          : '多规格商品:每个规格独立定价、独立库存;商城下单需选择规格。默认规格(规格名为空)是旧数据与移动端的兜底。'}
      </Typography.Paragraph>
      <Table<CrmProductSku>
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={list}
        pagination={false}
        columns={[
          {
            title: '规格',
            dataIndex: 'spec',
            width: 160,
            render: (_, r) =>
              r.spec ? (
                r.spec
              ) : (
                <Tag color="blue">默认规格</Tag>
              ),
          },
          { title: 'SKU编号', dataIndex: 'sku_no', width: 140, render: (_, r) => r.sku_no || '-' },
          {
            title: '售价',
            dataIndex: 'price',
            width: 100,
            render: (_, r) => (r.price ? `¥${r.price}` : '-'),
          },
          {
            title: '成本价',
            dataIndex: 'cost_price',
            width: 100,
            render: (_, r) => (r.cost_price ? `¥${r.cost_price}` : '-'),
          },
          {
            title: '规格图',
            dataIndex: 'image_url',
            width: 80,
            render: (_, r) =>
              r.image_url ? (
                <Image src={r.image_url} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} />
              ) : (
                '-'
              ),
          },
          {
            title: '操作',
            key: 'op',
            width: 120,
            render: (_, r) => (
              <Space>
                <Button type="link" size="small" onClick={() => openEdit(r)}>
                  编辑
                </Button>
                <Popconfirm
                  title="确认删除该规格?"
                  description="已有库存记录的规格不可删除"
                  okText="删除"
                  okButtonProps={{ danger: true }}
                  cancelText="取消"
                  onConfirm={() => handleDelete(r)}
                >
                  <Button type="link" size="small" danger disabled={list.length <= 1}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        style={{ marginTop: 16 }}
        onClick={openCreate}
      >
        新增规格
      </Button>

      <ModalForm<SkuFormValues>
        title={editing ? '编辑规格' : '新增规格'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={480}
      >
        <ProFormText
          name="spec"
          label="规格名称"
          placeholder="如 红色/M码;留空 = 默认规格"
          tooltip="同一商品下规格名不能重复;留空表示默认规格(只能有一个)"
        />
        <ProFormText
          name="sku_no"
          label="SKU编号"
          placeholder="留空自动生成(默认规格=产品编号)"
        />
        <Form.Item name="price" label="售价">
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="商城/销售默认价" />
        </Form.Item>
        <Form.Item name="cost_price" label="成本价">
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="成本价" />
        </Form.Item>
        <Form.Item name="image_url" label="规格图">
          <ImageUpload folder="product" />
        </Form.Item>
      </ModalForm>
    </Drawer>
  )
}
