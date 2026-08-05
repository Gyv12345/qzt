import { useEffect, useMemo, useRef, useState } from 'react'
import {
  App,
  Button,
  Form,
  Input,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Tag,
  TreeSelect,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ProForm,
  DrawerForm,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import ImageUpload from '../../../components/ImageUpload'
import MarkdownEditor from '../../../components/MarkdownEditor'
import {
  createArticle,
  deleteArticle,
  getArticle,
  getCategoryTree,
  listAllTags,
  listArticles,
  updateArticle,
} from '../../../services/cms'
import type { CmsArticle, CmsArticlePayload, CmsCategory } from '../../../types/cms'

interface ArticleFormValues {
  title: string
  slug?: string
  category_id?: number
  tag_ids?: number[]
  cover_url?: string
  summary?: string
  content?: string
  status: number
  is_top: boolean
  is_hot: boolean
  sort?: number
}

interface Option {
  label: string
  value: number
}

interface CategoryTreeNode {
  title: string
  value: number
  children?: CategoryTreeNode[]
}

const flattenCategories = (nodes: CmsCategory[] | null): Option[] => {
  if (!nodes || !nodes.length) return []
  return nodes.flatMap((n) => [{ label: n.name, value: n.id }, ...flattenCategories(n.children ?? [])])
}

const toTreeData = (nodes: CmsCategory[] | null): CategoryTreeNode[] => {
  if (!nodes || !nodes.length) return []
  return nodes.map((n) => ({
    title: n.name,
    value: n.id,
    children: n.children?.length ? toTreeData(n.children) : undefined,
  }))
}

export default function ArticlePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<ArticleFormValues>()

  const coverUrl = Form.useWatch('cover_url', form)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<CmsArticle | null>(null)
  const [categoryTree, setCategoryTree] = useState<CmsCategory[]>([])
  const [tagOptions, setTagOptions] = useState<Option[]>([])

  useEffect(() => {
    const load = async () => {
      const [tree, tags] = await Promise.all([getCategoryTree(), listAllTags()])
      setCategoryTree(tree)
      setTagOptions(tags.map((t) => ({ label: t.name, value: t.id })))
    }
    load()
  }, [])

  const categoryOptions = useMemo(() => flattenCategories(categoryTree), [categoryTree])
  const categoryTreeData = useMemo(() => toTreeData(categoryTree), [categoryTree])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 0, is_top: false, is_hot: false, sort: 0 })
    setDrawerOpen(true)
  }

  const openEdit = async (record: CmsArticle) => {
    const detail = await getArticle(record.id)
    setEditing(detail)
    form.setFieldsValue({
      title: detail.title,
      slug: detail.slug,
      category_id: detail.category_id || undefined,
      tag_ids: detail.tags?.map((t) => t.id) ?? [],
      cover_url: detail.cover_url || undefined,
      summary: detail.summary,
      content: detail.content,
      status: detail.status,
      is_top: detail.is_top === 1,
      is_hot: detail.is_hot === 1,
      sort: detail.sort,
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async (values: ArticleFormValues) => {
    const payload: CmsArticlePayload = {
      title: values.title,
      slug: values.slug || undefined,
      summary: values.summary,
      content: values.content,
      cover_url: values.cover_url,
      category_id: values.category_id,
      status: values.status,
      is_top: values.is_top ? 1 : 0,
      is_hot: values.is_hot ? 1 : 0,
      sort: values.sort,
      tag_ids: values.tag_ids,
    }
    if (editing) {
      await updateArticle(editing.id, payload)
      message.success('文章已更新')
    } else {
      await createArticle(payload)
      message.success('文章已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: CmsArticle) => {
    await deleteArticle(record.id)
    message.success('文章已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<CmsArticle>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '标题/别名', dataIndex: 'keyword', hideInTable: true },
    {
      title: '分类',
      dataIndex: 'category_id',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        options: categoryOptions,
        allowClear: true,
        showSearch: true,
        optionFilterProp: 'label',
      },
    },
    {
      key: 'status_search',
      title: '状态',
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        options: [
          { label: '草稿', value: 0 },
          { label: '已发布', value: 1 },
        ],
        allowClear: true,
      },
    },
    {
      title: '标签',
      dataIndex: 'tag_id',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        options: tagOptions,
        allowClear: true,
        showSearch: true,
        optionFilterProp: 'label',
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 220,
      search: false,
      render: (_, r) => (
        <Space size={4}>
          {r.is_top === 1 && <Tag color="red">顶</Tag>}
          {r.is_hot === 1 && <Tag color="orange">热</Tag>}
          <span>{r.title}</span>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: ['category', 'name'],
      width: 120,
      search: false,
      render: (_, r) => r.category?.name || '-',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 180,
      search: false,
      render: (_, r) =>
        r.tags?.length ? r.tags.map((t) => <Tag key={t.id}>{t.name}</Tag>) : '-',
    },
    { title: '作者', dataIndex: 'author_name', search: false, width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      search: false,
      width: 90,
      valueEnum: {
        0: { text: '草稿', status: 'Default' },
        1: { text: '已发布', status: 'Success' },
      },
    },
    { title: '阅读量', dataIndex: 'view_count', search: false, width: 80 },
    { title: '排序', dataIndex: 'sort', search: false, width: 70 },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', search: false, width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="cms:article:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="cms:article:delete">
            <Popconfirm
              title="确认删除该文章?"
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
      <ProTable<CmsArticle>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listArticles({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="cms:article:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增文章
            </Button>
          </Auth>,
        ]}
        headerTitle="文章列表"
      />
      <DrawerForm<ArticleFormValues>
        title={editing ? '编辑文章' : '新增文章'}
        form={form}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        drawerProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={720}
        grid
      >
        <ProFormText
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }]}
          placeholder="文章标题"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="slug"
          label="别名"
          placeholder="英文别名,留空自动生成"
          colProps={{ span: 12 }}
        />
        <ProForm.Item name="category_id" label="分类" colProps={{ span: 12 }}>
          <TreeSelect
            treeData={categoryTreeData}
            allowClear
            placeholder="选择分类"
            treeDefaultExpandAll
          />
        </ProForm.Item>
        <ProForm.Item name="tag_ids" label="标签" colProps={{ span: 12 }}>
          <Select mode="multiple" allowClear placeholder="选择标签" options={tagOptions} />
        </ProForm.Item>
        <ProForm.Item name="cover_url" hidden noStyle>
          <Input />
        </ProForm.Item>
        <ProForm.Item label="封面" colProps={{ span: 24 }}>
          <ImageUpload folder="article" value={coverUrl} onChange={(url) => {
            form.setFieldValue('cover_url', url)
            message.success('封面已上传')
          }} />
        </ProForm.Item>
        <ProFormTextArea
          name="summary"
          label="摘要"
          fieldProps={{ rows: 2 }}
          placeholder="文章摘要"
          colProps={{ span: 24 }}
        />
        <ProForm.Item name="content" label="内容" colProps={{ span: 24 }}>
          <MarkdownEditor height={420} placeholder="支持 Markdown 语法(标题/表格/图片/代码块等)" />
        </ProForm.Item>
        <ProForm.Item name="status" label="状态" colProps={{ span: 12 }}>
          <Radio.Group
            options={[
              { label: '草稿', value: 0 },
              { label: '已发布', value: 1 },
            ]}
          />
        </ProForm.Item>
        <ProForm.Item name="is_top" label="置顶" valuePropName="checked" colProps={{ span: 6 }}>
          <Switch />
        </ProForm.Item>
        <ProForm.Item name="is_hot" label="热门" valuePropName="checked" colProps={{ span: 6 }}>
          <Switch />
        </ProForm.Item>
        <ProFormDigit
          name="sort"
          label="排序"
          min={0}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
      </DrawerForm>
    </>
  )
}
