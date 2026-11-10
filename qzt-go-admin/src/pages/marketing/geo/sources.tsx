import { useCallback, useEffect, useState } from 'react'
import {
  App,
  Button,
  Drawer,
  Dropdown,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Tag,
  Tooltip,
} from 'antd'
import {
  ModalForm,
  ProForm,
  ProFormSelect,
  ProFormText,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components'
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Auth from '../../../components/Auth'
import MarkdownEditor from '../../../components/MarkdownEditor'
import {
  bindDouyin,
  createSource,
  createTopic,
  createVariant,
  deleteDouyinAccount,
  deleteSource,
  deleteTopic,
  generateSource,
  generateTopics,
  getDouyinAuthorizeURL,
  listDouyinAccounts,
  listSources,
  listTopics,
  pushSource,
  pushSourceDouyin,
  publishSource,
  qcSource,
  refreshPublish,
  reviewTopic,
  runPipeline,
  updateSource,
  updateTopic,
} from '../../../services/geo'
import type {
  GeoDouyinAccount,
  GeoSource,
  GeoSourceContentType,
  GeoSourcePlatform,
  GeoSourceStatus,
  GeoTopic,
  GeoTopicOrigin,
  GeoTopicStatus,
} from '../../../types/geo'

/** GEO 信源产线两个 Tab:选题池 / 信源库(图文+视频+分发稿+抖音账号)。 */

const TOPIC_ORIGIN: Record<GeoTopicOrigin, { color: string; label: string }> = {
  matrix: { color: 'blue', label: '手册矩阵' },
  ai: { color: 'purple', label: 'AI 生成' },
  manual: { color: 'default', label: '手工' },
}

const TOPIC_STATUS: Record<GeoTopicStatus, { color: string; label: string }> = {
  pending: { color: 'gold', label: '待审批' },
  approved: { color: 'green', label: '已批准' },
  rejected: { color: 'red', label: '已驳回' },
  used: { color: 'default', label: '已产稿' },
}

const CONTENT_TYPE: Record<GeoSourceContentType, string> = {
  article: '图文',
  video: '视频',
  video_script: '口播脚本',
}

const PLATFORM: Record<GeoSourcePlatform, string> = {
  wechat_mp: '公众号',
  douyin: '抖音',
  xhs: '小红书',
  zhihu: '知乎',
  csdn: 'CSDN',
  toutiao: '头条',
}

const SOURCE_STATUS: Record<GeoSourceStatus, { color: string; label: string }> = {
  generated: { color: 'gold', label: '待推送' },
  pushed: { color: 'processing', label: '已进草稿箱' },
  published: { color: 'success', label: '已发布' },
  failed: { color: 'error', label: '失败' },
  skipped: { color: 'default', label: '跳过' },
}

/** P18 AI 质检状态 */
const QC_STATUS: Record<string, { color: string; label: string }> = {
  none: { color: 'default', label: '未质检' },
  pass: { color: 'success', label: '质检通过' },
  warn: { color: 'gold', label: '带建议放行' },
  blocked: { color: 'error', label: '已阻断' },
}

/** P18 质检结果 JSON 解析形态（与后端 QCResult 对齐） */
interface QCResultView {
  dimensions: { key: string; name: string; score: number; issues: { quote: string; suggestion: string }[] }[]
  suggestions: string[]
  checked_at: string
  model: string
  local_ban?: string[]
}

/** 分发稿目标平台(母稿一键改写) */
const VARIANT_PLATFORMS: { key: GeoSourcePlatform; label: string }[] = [
  { key: 'zhihu', label: '知乎回答体' },
  { key: 'csdn', label: 'CSDN 技术向' },
  { key: 'xhs', label: '小红书笔记' },
  { key: 'toutiao', label: '头条资讯体' },
  { key: 'douyin', label: '抖音口播稿' },
]

// ── 选题池 ──

interface TopicFormValues {
  question: string
  reason: string
}

export function TopicsTab() {
  const { message } = App.useApp()
  const [form] = Form.useForm<TopicFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GeoTopic | null>(null)
  const [status, setStatus] = useState<string | undefined>()
  const [origin, setOrigin] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [generating, setGenerating] = useState(false)

  const [topics, setTopics] = useState<GeoTopic[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    listTopics({ page, page_size: pageSize, status, origin })
      .then((d) => {
        setTopics(d.list)
        setTotal(d.total)
      })
      .catch(() => setTopics([]))
      .finally(() => setLoading(false))
  }, [page, pageSize, status, origin])

  useEffect(() => load(), [load])

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue({ question: '', reason: '' })
    setModalOpen(true)
  }

  const openEdit = (r: GeoTopic) => {
    setEditing(r)
    form.setFieldsValue({ question: r.question, reason: r.reason })
    setModalOpen(true)
  }

  const handleSubmit = async (values: TopicFormValues) => {
    if (editing) {
      await updateTopic(editing.id, values)
      message.success('已更新')
    } else {
      await createTopic(values)
      message.success('已新增')
    }
    load()
    return true
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const r = await generateTopics()
      message.success(`AI 已产出 ${r.inserted} 个新选题(待审批)`)
      load()
    } finally {
      setGenerating(false)
    }
  }

  const columns: ProColumns<GeoTopic>[] = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '选题问题', dataIndex: 'question' },
    {
      title: '来源',
      dataIndex: 'origin',
      width: 100,
      render: (_, r) => <Tag color={TOPIC_ORIGIN[r.origin]?.color}>{TOPIC_ORIGIN[r.origin]?.label ?? r.origin}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (_, r) => <Tag color={TOPIC_STATUS[r.status]?.color}>{TOPIC_STATUS[r.status]?.label ?? r.status}</Tag>,
    },
    { title: '选题依据', dataIndex: 'reason', ellipsis: true, render: (v) => v || '-' },
    { title: '创建时间', dataIndex: 'created_at', width: 170 },
    {
      title: '操作',
      width: 200,
      render: (_, r) => (
        <Space>
          {r.status === 'pending' && (
            <>
              <Auth perm="marketing:geo:topic:review">
                <Button
                  type="link"
                  size="small"
                  onClick={async () => {
                    await reviewTopic(r.id, true)
                    message.success('已批准,进入产稿队列')
                    load()
                  }}
                >
                  通过
                </Button>
                <Popconfirm
                  title="驳回后该选题不再进入产稿队列,确认?"
                  onConfirm={async () => {
                    await reviewTopic(r.id, false)
                    message.success('已驳回')
                    load()
                  }}
                >
                  <Button type="link" size="small" danger>
                    驳回
                  </Button>
                </Popconfirm>
              </Auth>
            </>
          )}
          <Auth perm="marketing:geo:topic:edit">
            <Button type="link" size="small" onClick={() => openEdit(r)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="marketing:geo:topic:delete">
            <Popconfirm
              title="确认删除该选题?"
              onConfirm={async () => {
                await deleteTopic(r.id)
                message.success('已删除')
                load()
              }}
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
      <ProTable<GeoTopic>
        rowKey="id"
        headerTitle="选题池(AI 监测回流 + 手册矩阵 + 手工)"
        search={false}
        options={false}
        loading={loading}
        dataSource={topics}
        columns={columns}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
        }}
        toolBarRender={() => [
          <Select
            key="status"
            allowClear
            placeholder="全部状态"
            style={{ width: 120 }}
            value={status}
            onChange={(v) => setStatus(v)}
            options={Object.entries(TOPIC_STATUS).map(([value, s]) => ({ value, label: s.label }))}
          />,
          <Select
            key="origin"
            allowClear
            placeholder="全部来源"
            style={{ width: 120 }}
            value={origin}
            onChange={(v) => setOrigin(v)}
            options={Object.entries(TOPIC_ORIGIN).map(([value, o]) => ({ value, label: o.label }))}
          />,
          <Button key="reload" icon={<ReloadOutlined />} onClick={load}>
            刷新
          </Button>,
          <Button key="gen" loading={generating} onClick={handleGenerate}>
            <Auth perm="marketing:geo:topic:review">AI 生成选题</Auth>
          </Button>,
          <Button key="add" type="primary" onClick={openCreate}>
            <Auth perm="marketing:geo:topic:add">新增选题</Auth>
          </Button>,
        ]}
      />
      <ModalForm<TopicFormValues>
        title={editing ? '编辑选题' : '新增选题'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true }}
      >
        <ProFormText
          name="question"
          label="选题问题"
          width="lg"
          rules={[{ required: true, message: '请输入完整问题(不是关键词)' }]}
          placeholder="如:没有IT人力的公司怎么私有化部署软件?"
        />
        <ProForm.Item name="reason" label="选题依据">
          <Input.TextArea rows={2} placeholder="监测低分/竞品提及/引用缺口等(可空)" />
        </ProForm.Item>
      </ModalForm>
    </>
  )
}

// ── 信源库 ──

interface SourceFormValues {
  title: string
  digest: string
  content_md: string
  platform: GeoSourcePlatform
}

export function SourcesTab() {
  const { message } = App.useApp()
  const [form] = Form.useForm<SourceFormValues>()
  const [contentType, setContentType] = useState<string | undefined>()
  const [platform, setPlatform] = useState<string | undefined>()
  const [status, setStatus] = useState<string | undefined>()
  const [qcStatus, setQcStatus] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [list, setList] = useState<GeoSource[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GeoSource | null>(null)
  const [preview, setPreview] = useState<GeoSource | null>(null)
  const [running, setRunning] = useState(false)
  const [qcLoading, setQcLoading] = useState<number | null>(null)

  // P18 手动质检：AI 分维度评分，blocked 稿件推送入口会被后端拦截
  const handleQC = async (id: number) => {
    setQcLoading(id)
    try {
      const r = await qcSource(id)
      if (r?.skipped) {
        message.info(r.message || '质检跳过（LLM 不可用），稿件按未质检放行')
      } else {
        message.success(`质检完成：${QC_STATUS[r.qc_status]?.label ?? r.qc_status}`)
      }
      load()
    } finally {
      setQcLoading(null)
    }
  }
  const [accountsOpen, setAccountsOpen] = useState(false)
  const [accounts, setAccounts] = useState<GeoDouyinAccount[]>([])
  const [authCode, setAuthCode] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    listSources({ page, page_size: pageSize, content_type: contentType, platform, status, qc_status: qcStatus })
      .then((d) => {
        setList(d.list)
        setTotal(d.total)
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [page, pageSize, contentType, platform, status, qcStatus])

  useEffect(() => load(), [load])

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue({ title: '', digest: '', content_md: '', platform: 'wechat_mp' })
    setModalOpen(true)
  }

  const openEdit = (r: GeoSource) => {
    setEditing(r)
    form.setFieldsValue({ title: r.title, digest: r.digest, content_md: r.content_md, platform: r.platform })
    setModalOpen(true)
  }

  const handleSubmit = async (values: SourceFormValues) => {
    if (editing) {
      await updateSource(editing.id, {
        topic_id: editing.topic_id,
        content_type: editing.content_type,
        platform: values.platform,
        genre: editing.genre,
        title: values.title,
        digest: values.digest,
        content_md: values.content_md,
      })
      message.success('已更新')
    } else {
      await createSource({
        topic_id: 0,
        content_type: 'article',
        platform: values.platform,
        genre: '',
        title: values.title,
        digest: values.digest,
        content_md: values.content_md,
      })
      message.success('已新增')
    }
    load()
    return true
  }

  const handleRun = async () => {
    setRunning(true)
    message.info('产线执行中(选题→图文→视频→投递),预计数分钟,完成后刷新查看')
    try {
      const r = await runPipeline()
      message.success(`产线完成:选题 +${r.topics_generated} 图文 #${r.article_id}(推送=${r.article_pushed ? '是' : '否'}) ${r.notes}`)
      load()
    } catch {
      message.error('产线执行失败,详见后端日志')
    } finally {
      setRunning(false)
    }
  }

  const handleQuickGenerate = async () => {
    const article = await generateSource()
    message.success(`已产一篇图文:《${article.title}》(#${article.id})`)
    load()
  }

  const openAccounts = () => {
    setAccountsOpen(true)
    listDouyinAccounts()
      .then((d) => setAccounts(d.list))
      .catch(() => setAccounts([]))
  }

  const handleAuthorize = async () => {
    const { url } = await getDouyinAuthorizeURL()
    window.open(url, '_blank')
  }

  const handleBind = async () => {
    const raw = authCode.trim()
    if (!raw) {
      message.warning('请粘贴授权后回调页面的完整 URL 或其中的 code')
      return
    }
    const m = raw.match(/[?&]code=([^&]+)/)
    const code = m ? m[1] : raw
    await bindDouyin(code)
    message.success('绑定成功')
    setAuthCode('')
    openAccounts()
  }

  const columns: ProColumns<GeoSource>[] = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (_, r) => (
        <Space size={4}>
          {r.variant_of > 0 && <Tag color="purple">分发稿</Tag>}
          <span>{r.title}</span>
        </Space>
      ),
    },
    { title: '类型', dataIndex: 'content_type', width: 90, render: (_, r) => CONTENT_TYPE[r.content_type] ?? r.content_type },
    { title: '平台', dataIndex: 'platform', width: 90, render: (_, r) => PLATFORM[r.platform] ?? r.platform },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (_, r) => (
        <Tooltip title={r.error || undefined}>
          <Tag color={SOURCE_STATUS[r.status]?.color}>{SOURCE_STATUS[r.status]?.label ?? r.status}</Tag>
        </Tooltip>
      ),
    },
    {
      title: '质检',
      dataIndex: 'qc_status',
      width: 100,
      render: (_, r) => (
        <Tooltip
          title={
            r.qc_status === 'blocked' && r.qc_result
              ? `阻断原因：${(() => {
                  try {
                    const q = JSON.parse(r.qc_result) as QCResultView
                    if (q.local_ban?.length) return `广告法极限词：${q.local_ban.join('、')}`
                    const low = q.dimensions?.filter((d) => d.score < 60)
                    return low?.length ? low.map((d) => `${d.name} ${d.score} 分`).join('；') : '质检未达标'
                  } catch {
                    return '质检未达标'
                  }
                })()}`
              : undefined
        }
      >
        <Tag color={QC_STATUS[r.qc_status]?.color}>{QC_STATUS[r.qc_status]?.label ?? r.qc_status}</Tag>
      </Tooltip>
    ),
  },
    {
      title: '发布地址',
      dataIndex: 'publish_url',
      width: 150,
      ellipsis: true,
      render: (_, r) =>
        r.publish_url ? (
          <a href={r.publish_url} target="_blank" rel="noreferrer">
            查看
          </a>
        ) : (
          '-'
        ),
    },
    { title: '选题', dataIndex: 'topic_question', ellipsis: true, render: (v) => v || '-' },
    { title: '创建时间', dataIndex: 'created_at', width: 170 },
    {
      title: '操作',
      width: 260,
      render: (_, r) => (
        <Space size={0} wrap>
          <Button type="link" size="small" onClick={() => setPreview(r)}>
            预览
          </Button>
          <Auth perm="marketing:geo:source:edit">
            <Button type="link" size="small" onClick={() => openEdit(r)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="marketing:geo:source:qc">
            <Button
              type="link"
              size="small"
              loading={qcLoading === r.id}
              onClick={() => handleQC(r.id)}
            >
              质检
            </Button>
          </Auth>
          {r.content_type === 'article' && r.variant_of === 0 && r.status !== 'published' && (
            <Auth perm="marketing:geo:source:push">
              <Tooltip title={r.qc_status === 'blocked' ? '质检未通过（blocked），不可推送；请改稿后重新质检' : undefined}>
                <Popconfirm
                  title="推送进公众号草稿箱?(群发仍在 mp 后台人工确认)"
                  onConfirm={async () => {
                    await pushSource(r.id)
                    message.success('已进草稿箱,请在 mp 后台预览群发')
                    load()
                  }}
                >
                  <Button type="link" size="small" disabled={r.qc_status === 'blocked'}>
                    推草稿箱
                  </Button>
                </Popconfirm>
              </Tooltip>
            </Auth>
          )}
          {r.content_type === 'article' && r.status === 'pushed' && (
            <Auth perm="marketing:geo:source:publish">
              <Button
                type="link"
                size="small"
                onClick={async () => {
                  await publishSource(r.id)
                  message.success('已提交发布,稍后点「查状态」回填 URL')
                  load()
                }}
              >
                直接发布
              </Button>
              <Button
                type="link"
                size="small"
                onClick={async () => {
                  const s = await refreshPublish(r.id)
                  message.success(s.publish_url ? `发布成功:${s.publish_url}` : '仍在发布中,稍后再查')
                  load()
                }}
              >
                查状态
              </Button>
            </Auth>
          )}
          {r.content_type === 'video' && r.video_url && r.status !== 'published' && (
            <Auth perm="marketing:geo:source:publish">
              <Popconfirm
                title="直发到已绑定的抖音账号?"
                onConfirm={async () => {
                  const s = await pushSourceDouyin(r.id)
                  message.success(`已发布:${s.publish_url}`)
                  load()
                }}
              >
                <Button type="link" size="small" icon={<PlayCircleOutlined />}>
                  推抖音
                </Button>
              </Popconfirm>
            </Auth>
          )}
          {r.content_type === 'article' && r.variant_of === 0 && (
            <Auth perm="marketing:geo:source:variant">
              <Dropdown
                menu={{
                  items: VARIANT_PLATFORMS.map((p) => ({ key: p.key, label: p.label })),
                  onClick: async ({ key }) => {
                    await createVariant(r.id, key)
                    message.success(`已生成${PLATFORM[key as GeoSourcePlatform]}分发稿,列表刷新查看`)
                    load()
                  },
                }}
              >
                <Button type="link" size="small">
                  分发▼
                </Button>
              </Dropdown>
            </Auth>
          )}
          <Auth perm="marketing:geo:source:delete">
            <Popconfirm
              title="确认删除该稿件?"
              onConfirm={async () => {
                await deleteSource(r.id)
                message.success('已删除')
                load()
              }}
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
      <ProTable<GeoSource>
        rowKey="id"
        headerTitle="信源库(图文/视频/分发稿)"
        search={false}
        options={false}
        loading={loading}
        dataSource={list}
        columns={columns}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
        }}
        toolBarRender={() => [
          <Select
            key="ct"
            allowClear
            placeholder="全部类型"
            style={{ width: 110 }}
            value={contentType}
            onChange={(v) => setContentType(v)}
            options={Object.entries(CONTENT_TYPE).map(([value, label]) => ({ value, label }))}
          />,
          <Select
            key="pf"
            allowClear
            placeholder="全部平台"
            style={{ width: 110 }}
            value={platform}
            onChange={(v) => setPlatform(v)}
            options={Object.entries(PLATFORM).map(([value, label]) => ({ value, label }))}
          />,
          <Select
            key="st"
            allowClear
            placeholder="全部状态"
            style={{ width: 120 }}
            value={status}
            onChange={(v) => setStatus(v)}
            options={Object.entries(SOURCE_STATUS).map(([value, s]) => ({ value, label: s.label }))}
          />,
          <Select
            key="qc"
            allowClear
            placeholder="全部质检"
            style={{ width: 120 }}
            value={qcStatus}
            onChange={(v) => setQcStatus(v)}
            options={Object.entries(QC_STATUS).map(([value, s]) => ({ value, label: s.label }))}
          />,
          <Button key="reload" icon={<ReloadOutlined />} onClick={load}>
            刷新
          </Button>,
          <Button key="accounts" onClick={openAccounts}>
            <Auth perm="marketing:geo:douyin:manage">抖音账号</Auth>
          </Button>,
          <Button key="quick" onClick={handleQuickGenerate}>
            <Auth perm="marketing:geo:source:generate">手动产一篇</Auth>
          </Button>,
          <Button key="run" type="primary" loading={running} onClick={handleRun}>
            <Auth perm="marketing:geo:source:generate">立即跑一轮</Auth>
          </Button>,
          <Button key="add" onClick={openCreate}>
            <Auth perm="marketing:geo:source:add">新增稿件</Auth>
          </Button>,
        ]}
      />

      {/* 预览 */}
      <Drawer
        title={preview?.title}
        width="min(760px, 92vw)"
        open={!!preview}
        onClose={() => setPreview(null)}
        destroyOnHidden
      >
        {preview?.content_type === 'video' && preview.video_url ? (
          <video src={preview.video_url} controls style={{ width: '100%' }} />
        ) : null}
        {preview?.digest ? <p style={{ color: '#666' }}>{preview.digest}</p> : null}
        {/* P18 质检结果（分维度得分 + 修改建议） */}
        {preview?.qc_result ? (
          <div style={{ background: '#fafafa', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            {(() => {
              let q: QCResultView | null = null
              try {
                q = JSON.parse(preview.qc_result) as QCResultView
              } catch {
                return <span style={{ color: '#999' }}>质检结果解析失败</span>
              }
              if (!q) return null
              return (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <Space size={8} wrap>
                      <Tag color={QC_STATUS[preview.qc_status]?.color}>
                        {QC_STATUS[preview.qc_status]?.label ?? preview.qc_status}
                      </Tag>
                      <span style={{ color: '#999', fontSize: 12 }}>
                        {q.model} · {q.checked_at}
                      </span>
                    </Space>
                  </div>
                  {q.local_ban?.length ? (
                    <p style={{ color: '#cf1322', margin: '4px 0' }}>
                      广告法极限词命中：{q.local_ban.join('、')}
                    </p>
                  ) : null}
                  {q.dimensions?.map((d) => (
                    <div key={d.key} style={{ marginBottom: 4 }}>
                      <Space size={8}>
                        <span style={{ fontWeight: 500 }}>{d.name}</span>
                        <Tag color={d.score >= 80 ? 'success' : d.score >= 60 ? 'gold' : 'error'}>{d.score}</Tag>
                      </Space>
                      {d.issues?.map((iss, i) => (
                        <div key={i} style={{ color: '#666', fontSize: 12, paddingLeft: 8 }}>
                          「{iss.quote}」→ {iss.suggestion}
                        </div>
                      ))}
                    </div>
                  ))}
                  {q.suggestions?.length ? (
                    <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                      全局建议：
                      <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                        {q.suggestions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )
            })()}
          </div>
        ) : null}
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview?.content_md ?? ''}</ReactMarkdown>
      </Drawer>

      {/* 新增/编辑 */}
      <ModalForm<SourceFormValues>
        title={editing ? '编辑稿件' : '新增稿件'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true }}
        width={720}
      >
        <ProFormText
          name="title"
          label="标题"
          width="lg"
          rules={[{ required: true, message: '请输入标题' }]}
          placeholder="公众号标题(64 字内)"
        />
        <ProFormText name="digest" label="摘要" width="lg" placeholder="留空则由首段生成" />
        <ProFormSelect
          name="platform"
          label="平台"
          width="sm"
          options={Object.entries(PLATFORM).map(([value, label]) => ({ value, label }))}
        />
        <ProForm.Item
          name="content_md"
          label="正文 Markdown"
          rules={[{ required: true, message: '请输入正文' }]}
        >
          <MarkdownEditor height={320} />
        </ProForm.Item>
      </ModalForm>

      {/* 抖音账号 */}
      <Drawer
        title="抖音授权账号"
        width="min(520px, 92vw)"
        open={accountsOpen}
        onClose={() => setAccountsOpen(false)}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Button type="primary" onClick={handleAuthorize}>
            打开抖音授权页
          </Button>
          <div>
            <Input.TextArea
              rows={2}
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="授权完成后,把回调页面的完整 URL(含 ?code=...)或 code 粘贴到这里"
            />
            <Button style={{ marginTop: 8 }} onClick={handleBind}>
              完成绑定
            </Button>
          </div>
          {accounts.map((a) => (
            <div key={a.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
              <Space>
                <span>{a.nickname || a.open_id}</span>
                {a.enabled ? <Tag color="success">可用</Tag> : <Tag>停用</Tag>}
                <span style={{ color: '#999' }}>到期 {String(a.expires_at).slice(0, 19)}</span>
                <Popconfirm
                  title="确认解绑该账号?"
                  onConfirm={async () => {
                    await deleteDouyinAccount(a.id)
                    message.success('已解绑')
                    openAccounts()
                  }}
                >
                  <Button type="link" size="small" danger>
                    解绑
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          ))}
          {accounts.length === 0 && (
            <div style={{ color: '#999' }}>
              尚未绑定账号。前置:抖音开放平台自研应用过审 + 「第三方登录配置」里启用 douyin 渠道。
            </div>
          )}
        </Space>
      </Drawer>
    </>
  )
}
