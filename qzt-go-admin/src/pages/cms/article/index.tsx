import { useEffect, useMemo, useRef, useState } from 'react'
import {
  App,
  Button,
  Col,
  Dropdown,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  TreeSelect,
} from 'antd'
import { HistoryOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons'
import {
  ProForm,
  DrawerForm,
  ProFormDateTimePicker,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import dayjs, { type Dayjs } from 'dayjs'
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
  listArticleVersions,
  pushBaidu,
  pushIndexNow,
  rollbackArticleVersion,
  updateArticle,
  type ArticleVersion,
} from '../../../services/cms'
import type {
  CmsArticle,
  CmsArticlePayload,
  CmsCategory,
  CmsPushChannel,
  CmsPushResult,
} from '../../../types/cms'
import { pageIndexColumn } from '../../../components/IndexTag'

interface ArticleFormValues {
  title: string
  slug?: string
  category_id?: number
  tag_ids?: number[]
  cover_url?: string
  summary?: string
  content?: string
  status: number
  /** 定时发布时间(表单内为 dayjs,提交时格式化) */
  publish_at?: Dayjs | null
  /** 内容有效期至 */
  expire_at?: Dayjs | null
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

const pushMenuItems = [
  { key: 'baidu', label: '推送到百度' },
  { key: 'indexnow', label: '推送到 IndexNow' },
]

const describePush = (r: CmsPushResult) =>
  `${r.channel === 'baidu' ? '百度' : 'IndexNow'}推送: 成功${r.success} 跳过${r.skipped} 失败${r.failed}` +
  (r.channel === 'baidu' && r.total > 0 ? `，剩余配额 ${r.remain}` : '') +
  (r.message ? `（${r.message}）` : '')

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
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  // P20 版本弹窗状态
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionsArticle, setVersionsArticle] = useState<CmsArticle | null>(null)
  const [versions, setVersions] = useState<ArticleVersion[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)

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
      publish_at: detail.publish_at ? dayjs(detail.publish_at) : undefined,
      expire_at: detail.expire_at ? dayjs(detail.expire_at) : undefined,
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
      publish_at: values.publish_at ? values.publish_at.format('YYYY-MM-DD HH:mm:ss') : undefined,
      expire_at: values.expire_at ? values.expire_at.format('YYYY-MM-DD HH:mm:ss') : undefined,
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

  /** P20: 打开版本弹窗并加载版本列表 */
  const openVersions = async (record: CmsArticle) => {
    setVersionsArticle(record)
    setVersionsOpen(true)
    setVersionsLoading(true)
    try {
      const res = await listArticleVersions(record.id)
      setVersions(res.list)
    } finally {
      setVersionsLoading(false)
    }
  }

  /** P20: 回滚到指定版本(写回正文并保留版本链) */
  const handleRollback = async (v: ArticleVersion) => {
    if (!versionsArticle) return
    await rollbackArticleVersion(versionsArticle.id, v.id)
    message.success(`已回滚到第 ${v.version_no} 版`)
    // 回滚后刷新版本列表与文章列表
    const res = await listArticleVersions(versionsArticle.id)
    setVersions(res.list)
    actionRef.current?.reload()
  }

  const handlePush = async (channel: CmsPushChannel, ids: number[]) => {
    const res = channel === 'baidu' ? await pushBaidu({ article_ids: ids }) : await pushIndexNow({ article_ids: ids })
    if (res.total === 0) {
      message.warning(res.message || '没有可推送的URL')
      return
    }
    if (res.failed > 0) message.warning(describePush(res))
    else message.success(describePush(res))
  }

  const columns: ProColumns<CmsArticle>[] = [
    pageIndexColumn(actionRef),
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
    {
      title: '发布/到期',
      search: false,
      width: 165,
      render: (_, r) => (
        <Space size={0} direction="vertical">
          <span style={{ fontSize: 12 }}>{r.publish_at ? dayjs(r.publish_at).format('MM-DD HH:mm') : '-'}</span>
          <span style={{ fontSize: 12 }}>{r.expire_at ? `至 ${dayjs(r.expire_at).format('MM-DD HH:mm')}` : '永久'}</span>
        </Space>
      ),
    },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', search: false, width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="cms:article:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="cms:article:version">
            <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => openVersions(record)}>
              版本
            </Button>
          </Auth>
          <Auth perm="cms:article:push">
            <Dropdown
              menu={{
                items: pushMenuItems,
                onClick: ({ key }) => handlePush(key as CmsPushChannel, [record.id]),
              }}
            >
              <Button type="link" size="small">
                推送
              </Button>
            </Dropdown>
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
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as number[]),
        }}
        toolBarRender={() => [
          <Auth perm="cms:article:push" key="push">
            <Dropdown
              disabled={selectedIds.length === 0}
              menu={{
                items: pushMenuItems,
                onClick: ({ key }) => handlePush(key as CmsPushChannel, selectedIds),
              }}
            >
              <Button icon={<SendOutlined />}>
                推送搜索引擎{selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </Button>
            </Dropdown>
          </Auth>,
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
        <Col span={12}>
          <ProForm.Item name="category_id" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
            <TreeSelect
              treeData={categoryTreeData}
              allowClear
              placeholder="选择分类"
              treeDefaultExpandAll
            />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="tag_ids" label="标签">
            <Select mode="multiple" allowClear placeholder="选择标签" options={tagOptions} />
          </ProForm.Item>
        </Col>
        <ProForm.Item name="cover_url" hidden noStyle>
          <Input />
        </ProForm.Item>
        <Col span={24}>
          <ProForm.Item label="封面">
            <ImageUpload folder="article" value={coverUrl} onChange={(url) => {
              form.setFieldValue('cover_url', url)
              message.success('封面已上传')
            }} />
          </ProForm.Item>
        </Col>
        <ProFormTextArea
          name="summary"
          label="摘要"
          fieldProps={{ rows: 2 }}
          placeholder="文章摘要"
          colProps={{ span: 24 }}
        />
        <Col span={24}>
          <ProForm.Item name="content" label="内容">
            <MarkdownEditor height={420} placeholder="支持 Markdown 语法(标题/表格/图片/代码块等)" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="status" label="状态">
            <Radio.Group
              options={[
                { label: '草稿', value: 0 },
                { label: '已发布', value: 1 },
              ]}
            />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProFormDateTimePicker
            name="publish_at"
            label="定时发布时间"
            placeholder="不填=立即发布"
            fieldProps={{ showTime: true, format: 'YYYY-MM-DD HH:mm:ss' }}
            extra="设置了定时的文章到点前官网不可见,到点后自动可见并推送搜索引擎"
          />
        </Col>
        <Col span={12}>
          <ProFormDateTimePicker
            name="expire_at"
            label="有效期至"
            placeholder="不填=永久有效"
            fieldProps={{ showTime: true, format: 'YYYY-MM-DD HH:mm:ss' }}
            extra="到期后官网自动下线,管理端仍可见可编辑"
          />
        </Col>
        <Col span={6}>
          <ProForm.Item name="is_top" label="置顶" valuePropName="checked">
            <Switch />
          </ProForm.Item>
        </Col>
        <Col span={6}>
          <ProForm.Item name="is_hot" label="热门" valuePropName="checked">
            <Switch />
          </ProForm.Item>
        </Col>
        <ProFormDigit
          name="sort"
          label="排序"
          min={0}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
      </DrawerForm>
      <Modal
        title={`版本记录 - ${versionsArticle?.title ?? ''}`}
        open={versionsOpen}
        onCancel={() => setVersionsOpen(false)}
        footer={null}
        width={720}
      >
        <Table<ArticleVersion>
          rowKey="id"
          size="small"
          loading={versionsLoading}
          dataSource={versions}
          pagination={false}
          columns={[
            { title: '版本', dataIndex: 'version_no', width: 60 },
            { title: '标题', dataIndex: 'title', ellipsis: true },
            { title: '操作人', dataIndex: 'editor_name', width: 100 },
            { title: '快照时间', dataIndex: 'created_at', width: 170 },
            {
              title: '操作',
              width: 90,
              render: (_, v) => (
                <Popconfirm
                  title={`回滚到第 ${v.version_no} 版?`}
                  description="当前内容会先自动快照,可再滚回来"
                  okText="回滚"
                  cancelText="取消"
                  onConfirm={() => handleRollback(v)}
                >
                  <Button type="link" size="small">
                    回滚
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Modal>
    </>
  )
}
