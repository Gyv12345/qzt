import { useRef, useState } from 'react'
import {
  App,
  Button,
  Form,
  Image,
  InputNumber,
  Popconfirm,
  Radio,
  Select,
  Space,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import DictSelect, { DictTag } from '../../../components/DictSelect'
import MarkdownEditor from '../../../components/MarkdownEditor'
import ImageUpload from '../../../components/ImageUpload'
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  type ProductQuery,
} from '../../../services/crm'
import type {
  CrmProduct,
  CrmProductPayload,
} from '../../../types/crm'

interface ProductFormValues {
  name: string
  product_no?: string
  category?: string
  unit?: string
  standard_price?: number
  cost_price?: number
  status: number
  image_url?: string
  description?: string
}

export default function ProductPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)

  // 产品新增/编辑
  const [form] = Form.useForm<ProductFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmProduct | null>(null)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 1 } as Partial<ProductFormValues>)
    setModalOpen(true)
  }

  const openEdit = (record: CrmProduct) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      product_no: record.product_no || undefined,
      category: record.category || undefined,
      unit: record.unit || undefined,
      standard_price: record.standard_price ? Number(record.standard_price) : undefined,
      cost_price: record.cost_price ? Number(record.cost_price) : undefined,
      status: record.status,
      image_url: record.image_url || undefined,
      description: record.description || undefined,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: ProductFormValues) => {
    const payload: CrmProductPayload = {
      name: values.name,
      product_no: values.product_no,
      category: values.category,
      unit: values.unit,
      standard_price: values.standard_price,
      cost_price: values.cost_price,
      status: values.status,
      image_url: values.image_url,
      description: values.description,
    }
    if (editing) {
      await updateProduct(editing.id, payload)
      message.success('产品已更新')
    } else {
      await createProduct(payload)
      message.success('产品已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: CrmProduct) => {
    await deleteProduct(record.id)
    message.success('产品已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<CrmProduct>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '产品名称', dataIndex: 'keyword', hideInTable: true },
    {
      title: '分类',
      dataIndex: 'category',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="PRODUCT_CATEGORY" placeholder="请选择分类" />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInTable: true,
      renderFormItem: () => (
        <Select
          allowClear
          placeholder="请选择状态"
          options={[
            { label: '上架', value: 1 },
            { label: '下架', value: 2 },
          ]}
        />
      ),
    },
    {
      title: '主图',
      dataIndex: 'image_url',
      width: 90,
      search: false,
      render: (_, r) =>
        r.image_url ? (
          <Image src={r.image_url} width={56} height={56} style={{ objectFit: 'cover', borderRadius: 6 }} />
        ) : (
          '-'
        ),
    },
    { title: '产品名称', dataIndex: 'name', width: 220, search: false },
    {
      title: '产品编号',
      dataIndex: 'product_no',
      width: 120,
      search: false,
      render: (_, r) => r.product_no || '-',
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 100,
      search: false,
      render: (_, r) => <DictTag code="PRODUCT_CATEGORY" value={r.category} />,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      search: false,
      width: 80,
      render: (_, r) => r.unit || '-',
    },
    {
      title: '标准价',
      dataIndex: 'standard_price',
      search: false,
      width: 100,
      render: (_, r) => (r.standard_price ? `¥${r.standard_price}` : '-'),
    },
    {
      title: '成本价',
      dataIndex: 'cost_price',
      search: false,
      width: 100,
      render: (_, r) => (r.cost_price ? `¥${r.cost_price}` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      search: false,
      width: 80,
      valueEnum: {
        1: { text: '上架', status: 'Success' },
        2: { text: '下架', status: 'Default' },
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="crm:product:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="crm:product:delete">
            <Popconfirm
              title="确认删除该产品?"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<CrmProduct, ProductQuery>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listProducts({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="crm:product:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增产品
            </Button>
          </Auth>,
        ]}
        headerTitle="产品列表"
      />
      <ModalForm<ProductFormValues>
        title={editing ? '编辑产品' : '新增产品'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <ProFormText
          name="name"
          label="产品名称"
          rules={[{ required: true, message: '请输入产品名称' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText name="product_no" label="产品编号" placeholder="产品编号" colProps={{ span: 12 }} />
        <ProForm.Item name="category" label="分类" colProps={{ span: 12 }}>
          <DictSelect code="PRODUCT_CATEGORY" placeholder="请选择分类" />
        </ProForm.Item>
        <ProFormText name="unit" label="单位" placeholder="如 套/个/年" colProps={{ span: 12 }} />
        <ProForm.Item name="standard_price" label="标准价" colProps={{ span: 12 }}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="标准价" />
        </ProForm.Item>
        <ProForm.Item name="cost_price" label="成本价" colProps={{ span: 12 }}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="成本价" />
        </ProForm.Item>
        <ProForm.Item
          name="status"
          label="状态"
          rules={[{ required: true, message: '请选择状态' }]}
          colProps={{ span: 12 }}
        >
          <Radio.Group
            options={[
              { label: '上架', value: 1 },
              { label: '下架', value: 2 },
            ]}
          />
        </ProForm.Item>
        <ProForm.Item name="image_url" label="产品主图" colProps={{ span: 24 }}>
          <ImageUpload folder="product" />
        </ProForm.Item>
        <ProForm.Item name="description" label="产品详情(Markdown)" colProps={{ span: 24 }}>
          <MarkdownEditor height={400} placeholder="支持 Markdown 语法编写产品详情" />
        </ProForm.Item>
      </ModalForm>
    </>
  )
}
