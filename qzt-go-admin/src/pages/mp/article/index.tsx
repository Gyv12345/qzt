import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Form, Popconfirm, Tag, Tooltip, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  DrawerForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  createArticle,
  deleteArticle,
  listAccounts,
  listArticles,
  type MpArticlePayload,
} from '../../../services/mp'
import type { MpAccount, MpArticle } from '../../../types/mp'

interface ArticleCreateValues {
  account_id: number
  title?: string
  theme?: string
  points?: string
}

/** 文章状态 → Tag 展示映射 */
const STATUS_META: Record<MpArticle['status'], { color: string; text: string }> = {
  draft: { color: 'default', text: '草稿' },
  pushed: { color: 'green', text: '已推草稿箱' },
  failed: { color: 'red', text: '推送失败' },
}

export default function MpArticlePage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<ArticleCreateValues>()
  const [accounts, setAccounts] = useState<MpAccount[]>([])
  const [createOpen, setCreateOpen] = useState(false)

  // 账号下拉数据:筛选与新建表单共用
  useEffect(() => {
    listAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]))
  }, [])

  const accountOptions = accounts.map((a) => ({ label: a.name, value: a.id }))
  const enabledAccountOptions = accounts
    .filter((a) => a.enabled === 1)
    .map((a) => ({ label: a.name, value: a.id }))

  const openCreate = () => {
    form.resetFields()
    setCreateOpen(true)
  }

  const handleCreate = async (values: ArticleCreateValues) => {
    const payload: MpArticlePayload = {
      account_id: values.account_id,
      title: values.title,
      theme: values.theme,
      points: values.points,
    }
    const created = await createArticle(payload)
    message.success('文章已创建')
    setCreateOpen(false)
    navigate(`/mp/article/editor?id=${created.id}`)
    return true
  }

  const handleDelete = async (record: MpArticle) => {
    await deleteArticle(record.id)
    message.success('文章已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<MpArticle>[] = [
    {
      title: '状态',
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        options: [
          { label: '草稿', value: 'draft' },
          { label: '已推草稿箱', value: 'pushed' },
          { label: '推送失败', value: 'failed' },
        ],
        allowClear: true,
      },
    },
    {
      title: '账号',
      dataIndex: 'account_id',
      hideInTable: true,
      valueType: 'select',
      fieldProps: { options: accountOptions, allowClear: true, showSearch: true },
    },
    { title: 'ID', dataIndex: 'id', width: 70, search: false },
    {
      title: '标题',
      dataIndex: 'title',
      width: 240,
      search: false,
      ellipsis: true,
      render: (_, r) => (
        <a onClick={() => navigate(`/mp/article/editor?id=${r.id}`)}>{r.title || '(未命名)'}</a>
      ),
    },
    {
      title: '所属账号',
      dataIndex: 'account_name',
      width: 140,
      search: false,
      ellipsis: true,
      render: (_, r) => r.account_name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      search: false,
      render: (_, r) => {
        const meta = STATUS_META[r.status] ?? STATUS_META.draft
        const tag = <Tag color={meta.color}>{meta.text}</Tag>
        return r.status === 'failed' && r.error_msg ? (
          <Tooltip title={r.error_msg}>{tag}</Tooltip>
        ) : (
          tag
        )
      },
    },
    {
      title: '微信素材ID',
      dataIndex: 'wx_media_id',
      width: 180,
      search: false,
      ellipsis: true,
      render: (_, r) =>
        r.wx_media_id ? (
          <Typography.Text copyable style={{ fontSize: 12 }}>
            {r.wx_media_id}
          </Typography.Text>
        ) : (
          '-'
        ),
    },
    {
      title: '推送时间',
      dataIndex: 'pushed_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
      render: (_, r) => r.pushed_at || '-',
    },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', search: false, width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <>
          <Auth perm="mp:article:edit">
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/mp/article/editor?id=${record.id}`)}
            >
              编辑
            </Button>
          </Auth>
          <Auth perm="mp:article:delete">
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
        </>
      ),
    },
  ]

  return (
    <>
      <ProTable<MpArticle>
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
          <Auth perm="mp:article:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建文章
            </Button>
          </Auth>,
        ]}
        headerTitle="公众号文章"
      />
      <DrawerForm<ArticleCreateValues>
        title="新建文章"
        form={form}
        open={createOpen}
        onOpenChange={setCreateOpen}
        drawerProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleCreate}
        width={560}
      >
        <ProFormSelect
          name="account_id"
          label="所属账号"
          rules={[{ required: true, message: '请选择所属账号' }]}
          options={enabledAccountOptions}
          placeholder="选择公众号账号"
        />
        <ProFormText
          name="title"
          label="标题"
          placeholder="留空由 AI 生成"
        />
        <ProFormText
          name="theme"
          label="主题"
          placeholder="AI 生成要围绕的主题"
          extra="AI 生成要围绕的主题"
        />
        <ProFormTextArea
          name="points"
          label="要点"
          fieldProps={{ rows: 4 }}
          placeholder={'每行一个要点,如:\n面向中小企业的获客方法\n结合知识库案例'}
          extra="换行分隔,每行一个要点"
        />
      </DrawerForm>
    </>
  )
}
