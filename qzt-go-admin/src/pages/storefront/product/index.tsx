import { useRef, useState } from 'react'
import { App, Button, Divider, Segmented, Space, Tag } from 'antd'
import {
  ModalForm,
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { pageIndexColumn } from '../../../components/IndexTag'
import { listProducts } from '../../../services/crm'
import { createProduct, getStorefrontProduct, listStorefrontProducts, updateProduct } from '../../../services/storefront'
import type { StorefrontI18n, StorefrontProduct, StorefrontProductStatus } from '../../../types/storefront'

const CURRENCY_OPTIONS = [
  { label: 'USD(美元)', value: 'USD' },
  { label: 'EUR(欧元)', value: 'EUR' },
  { label: 'GBP(英镑)', value: 'GBP' },
  { label: 'CNY(人民币)', value: 'CNY' },
]

const STATUS_TEXT: Record<StorefrontProductStatus, string> = { 1: '上架', 2: '下架' }
const STATUS_COLOR: Record<StorefrontProductStatus, string> = { 1: 'success', 2: 'default' }

const LOCALE_KEYS: ('en' | 'zh')[] = ['en', 'zh']

/** 翻译完整度:en/zh 固定展示,已翻译绿/未翻译灰,其余 locale 追加展示 */
function LocaleTags({ done }: { done: string[] }) {
  const extras = done.filter((l) => l !== 'en' && l !== 'zh')
  return (
    <Space size={4} wrap>
      {[...LOCALE_KEYS, ...extras].map((l) => (
        <Tag key={l} color={done.includes(l) ? 'green' : 'default'} style={{ marginInlineEnd: 0 }}>
          {l}
        </Tag>
      ))}
    </Space>
  )
}

/** 单语言三字段(名称/简介/详情);requiredName 控制该语言名称必填(英文) */
function LocaleFields({ locale, label, requiredName }: { locale: 'en' | 'zh'; label: string; requiredName?: boolean }) {
  return (
    <>
      <Divider orientation="left" orientationMargin={0} style={{ marginTop: 8 }}>
        {label}
      </Divider>
      <ProFormText
        name={['i18n', locale, 'name']}
        label="名称"
        rules={requiredName ? [{ required: true, message: `请填写${label}名称` }] : undefined}
        colProps={{ span: 12 }}
      />
      <ProFormTextArea
        name={['i18n', locale, 'summary']}
        label="简介"
        fieldProps={{ autoSize: { minRows: 1, maxRows: 3 } }}
        colProps={{ span: 12 }}
      />
      <ProFormTextArea
        name={['i18n', locale, 'description']}
        label="详情"
        fieldProps={{ autoSize: { minRows: 2, maxRows: 6 } }}
        colProps={{ span: 24 }}
      />
    </>
  )
}

interface ProductFormValues {
  product_id?: number
  slug: string
  status: StorefrontProductStatus
  sort?: number
  price?: number | null
  currency: string
  featured: boolean
  i18n: StorefrontI18n
}

/** 独立站商品管理:列表 + 翻译/编辑 + 新增选品 + 快捷上下架 */
export default function StorefrontProductPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editing, setEditing] = useState<StorefrontProduct | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const toggleStatus = async (record: StorefrontProduct) => {
    const next: StorefrontProductStatus = record.status === 1 ? 2 : 1
    await updateProduct(record.id, { status: next })
    message.success(`已${STATUS_TEXT[next]}`)
    actionRef.current?.reload()
  }

  const columns: ProColumns<StorefrontProduct>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '搜索 slug / 商品名' } },
    { title: '翻译', dataIndex: 'locales_done', width: 110, search: false, render: (_, r) => <LocaleTags done={r.locales_done ?? []} /> },
    { title: 'slug', dataIndex: 'slug', width: 180, ellipsis: true, copyable: true, search: false },
    { title: 'CRM 商品', dataIndex: 'crm_name', width: 160, ellipsis: true, search: false },
    {
      title: '直标价',
      dataIndex: 'price',
      width: 130,
      search: false,
      render: (_, r) =>
        r.price != null ? (
          <span style={{ fontWeight: 600 }}>{r.currency} {Number(r.price).toFixed(2)}</span>
        ) : (
          <Tag>按 CRM 价折算</Tag>
        ),
    },
    { title: '币种', dataIndex: 'currency', width: 80, search: false },
    { title: '状态', dataIndex: 'status', width: 80, search: false, render: (_, r) => <Tag color={STATUS_COLOR[r.status]}>{STATUS_TEXT[r.status]}</Tag> },
    { title: '推荐', dataIndex: 'featured', width: 80, search: false, render: (_, r) => (r.featured ? <Tag color="gold">推荐</Tag> : <Tag>常规</Tag>) },
    { title: '排序', dataIndex: 'sort', width: 70, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Auth perm="storefront:product:edit">
          <Space>
            <Button
              type="link"
              size="small"
              onClick={async () => {
                // 编辑回填必须取详情:列表行 price 是折算展示价,直标价原值与各语言原文只在详情里
                const detail = await getStorefrontProduct(record.id)
                setEditing(detail)
                setEditOpen(true)
              }}
            >
              翻译
            </Button>
            <Button type="link" size="small" danger={record.status === 1} onClick={() => toggleStatus(record)}>
              {record.status === 1 ? '下架' : '上架'}
            </Button>
          </Space>
        </Auth>
      ),
    },
  ]

  return (
    <>
      <ProTable<StorefrontProduct>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, keyword } = params
          const data = await listStorefrontProducts({
            page: current || 1,
            page_size: pageSize || 10,
            keyword: keyword?.trim() || undefined,
          })
          return { data: data.list, total: data.total, success: true }
        }}
        headerTitle="独立站商品"
        toolBarRender={() => [
          <Auth key="create" perm="storefront:product:edit">
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              新增上架商品
            </Button>
          </Auth>,
        ]}
      />

      {/* 编辑/翻译:契约列表行只给解析后的 name/summary/description,无分 locale 原文,
          英文字段以解析值预填(通常为 en),中文需人工补齐 */}
      <ModalForm<ProductFormValues>
        key={editing?.id ?? 'edit'}
        title={`编辑翻译:${editing?.slug ?? ''}`}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditing(null)
        }}
        modalProps={{ destroyOnHidden: true, width: 720 }}
        grid
        initialValues={{
          slug: editing?.slug,
          status: editing?.status ?? 2,
          sort: editing?.sort ?? 0,
          price: editing?.direct_price ?? undefined,
          currency: editing?.currency ?? 'USD',
          featured: editing?.featured ?? false,
          i18n: {
            en: editing?.i18n?.en ?? { name: editing?.name, summary: editing?.summary, description: editing?.description },
            zh: editing?.i18n?.zh ?? {},
          },
        }}
        onFinish={async (values) => {
          if (!editing) return false
          await updateProduct(editing.id, {
            slug: values.slug,
            status: values.status,
            sort: values.sort ?? 0,
            price: values.price ?? null,
            currency: values.currency,
            featured: !!values.featured,
            i18n: {
              en: {
                name: values.i18n?.en?.name ?? '',
                summary: values.i18n?.en?.summary ?? '',
                description: values.i18n?.en?.description ?? '',
              },
              zh: {
                name: values.i18n?.zh?.name ?? '',
                summary: values.i18n?.zh?.summary ?? '',
                description: values.i18n?.zh?.description ?? '',
              },
            },
          })
          message.success('翻译已保存')
          setEditOpen(false)
          setEditing(null)
          actionRef.current?.reload()
          return true
        }}
      >
        <ProFormText name="slug" label="URL Slug" rules={[{ required: true, message: '请填写 slug' }]} colProps={{ span: 12 }} />
        <ProForm.Item name="status" label="状态" colProps={{ span: 12 }}>
          <Segmented options={[{ label: '上架', value: 1 }, { label: '下架', value: 2 }]} />
        </ProForm.Item>
        <ProFormDigit name="sort" label="排序" min={0} fieldProps={{ precision: 0 }} colProps={{ span: 8 }} />
        <ProFormDigit name="price" label="直标价" tooltip="留空=按 CRM 价折算;清空保存即回落折算" min={0} colProps={{ span: 8 }} />
        <ProFormSelect name="currency" label="币种" options={CURRENCY_OPTIONS} colProps={{ span: 8 }} />
        <ProFormSwitch name="featured" label="首页推荐" colProps={{ span: 12 }} />
        <LocaleFields locale="en" label="英文(en)" requiredName />
        <LocaleFields locale="zh" label="中文(zh)" />
      </ModalForm>

      {/* 新增:选品用数据选择器(禁止手输 ID),从 CRM 商品列表选择 */}
      <ModalForm<ProductFormValues>
        title="新增上架商品"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnHidden: true, width: 720 }}
        grid
        initialValues={{ status: 2, sort: 0, currency: 'USD', featured: false }}
        onFinish={async (values) => {
          await createProduct({
            product_id: values.product_id,
            slug: values.slug,
            status: values.status,
            sort: values.sort ?? 0,
            price: values.price ?? null,
            currency: values.currency,
            featured: !!values.featured,
            i18n: {
              en: {
                name: values.i18n?.en?.name ?? '',
                summary: values.i18n?.en?.summary ?? '',
                description: values.i18n?.en?.description ?? '',
              },
              zh: {
                name: values.i18n?.zh?.name ?? '',
                summary: values.i18n?.zh?.summary ?? '',
                description: values.i18n?.zh?.description ?? '',
              },
            },
          })
          message.success('已创建')
          setCreateOpen(false)
          actionRef.current?.reload()
          return true
        }}
      >
        <ProFormSelect
          name="product_id"
          label="关联 CRM 商品"
          rules={[{ required: true, message: '请选择 CRM 商品' }]}
          request={async () => {
            const data = await listProducts({ page: 1, page_size: 100 })
            return data.list.map((p) => ({ label: `${p.name}(${p.product_no})`, value: p.id }))
          }}
          fieldProps={{ showSearch: true, optionFilterProp: 'label', placeholder: '搜索商品名选择,禁止手输 ID' }}
          colProps={{ span: 24 }}
        />
        <ProFormText name="slug" label="URL Slug" rules={[{ required: true, message: '请填写 slug' }]} colProps={{ span: 12 }} />
        <ProForm.Item name="status" label="状态" colProps={{ span: 12 }}>
          <Segmented options={[{ label: '上架', value: 1 }, { label: '下架', value: 2 }]} />
        </ProForm.Item>
        <ProFormDigit name="sort" label="排序" min={0} fieldProps={{ precision: 0 }} colProps={{ span: 8 }} />
        <ProFormDigit name="price" label="直标价" tooltip="留空=按 CRM 价折算" min={0} colProps={{ span: 8 }} />
        <ProFormSelect name="currency" label="币种" options={CURRENCY_OPTIONS} colProps={{ span: 8 }} />
        <ProFormSwitch name="featured" label="首页推荐" colProps={{ span: 12 }} />
        <LocaleFields locale="en" label="英文(en)" requiredName />
        <LocaleFields locale="zh" label="中文(zh)" />
      </ModalForm>
    </>
  )
}
