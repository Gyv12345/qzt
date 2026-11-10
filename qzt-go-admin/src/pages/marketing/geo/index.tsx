import { useCallback, useEffect, useRef, useState } from 'react'
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd'
import {
  ModalForm,
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import Chart, { lineOption } from '../../../components/Chart'
import Auth from '../../../components/Auth'
import {
  createPlatform,
  createPrompt,
  deletePlatform,
  deletePrompt,
  exportRun,
  getGeoTrend,
  listPlatforms,
  listPrompts,
  listResults,
  listRuns,
  startRun,
  updatePlatform,
  updatePrompt,
} from '../../../services/geo'
import type {
  GeoPlatform,
  GeoPrompt,
  GeoPromptGroup,
  GeoResultRow,
  GeoRun,
} from '../../../types/geo'
import { SourcesTab, TopicsTab } from './sources'

/** GEO 监测与信源产线:手册第六节「20 问 × N 平台打分表」系统化 + 每日信源自动化产线。
 *  五个 Tab:监测看板 / 提示词库 / 平台管理 / 选题池 / 信源库。 */

const GROUP_LABELS: Record<GeoPromptGroup, string> = {
  brand: '品牌词(防御)',
  category: '品类词(进攻)',
  scenario: '场景词(长尾)',
}

const RUN_STATUS: Record<string, { color: string; label: string }> = {
  running: { color: 'processing', label: '执行中' },
  done: { color: 'success', label: '已完成' },
  failed: { color: 'error', label: '失败' },
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`

function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  // fn 引用不参与 run 的依赖(调用方常传内联箭头函数,每次渲染都是新引用,
  // 若直接依赖会无限重发请求);需要随某状态重新拉取时,显式把该状态放进 deps。
  const fnRef = useRef(fn)
  fnRef.current = fn
  const run = useCallback(() => {
    setLoading(true)
    fnRef.current().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps])
  return { data, loading, reload: run }
}

// ── 监测看板 ──

function DashboardTab() {
  const { message } = App.useApp()
  const [detailRun, setDetailRun] = useState<GeoRun | null>(null)
  const [starting, setStarting] = useState(false)

  const trend = useAsync(() => getGeoTrend(12))
  const runs = useAsync(() => listRuns({ page: 1, page_size: 50 }))

  const latest = (runs.data?.list ?? []).find((r) => r.status === 'done') ?? null

  const handleStart = async () => {
    setStarting(true)
    try {
      const r = await startRun()
      message.success(`监测已启动:本轮 ${r.prompt_count} 问 × ${r.platform_count} 平台,执行中`)
      runs.reload()
    } finally {
      setStarting(false)
    }
  }

  const runColumns: ProColumns<GeoRun>[] = [
    { title: '轮次', dataIndex: 'id', width: 70 },
    {
      title: '触发',
      dataIndex: 'trigger',
      width: 80,
      render: (_, r) => (r.trigger === 'schedule' ? '定时' : '手动'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (_, r) => <Tag color={RUN_STATUS[r.status]?.color}>{RUN_STATUS[r.status]?.label ?? r.status}</Tag>,
    },
    { title: '结果数', dataIndex: 'total_results', width: 100, render: (_, r) => `${r.total_results} (失败 ${r.error_count})` },
    { title: '得分', width: 90, render: (_, r) => `${r.total_score} / ${r.max_score}` },
    { title: 'AI 推荐率', dataIndex: 'recommend_rate', width: 110, render: (_, r) => pct(r.recommend_rate) },
    { title: '自有引用率', dataIndex: 'own_cite_rate', width: 110, render: (_, r) => pct(r.own_cite_rate) },
    { title: '开始时间', dataIndex: 'started_at', width: 170 },
    {
      title: '操作',
      width: 150,
      render: (_, r) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => setDetailRun(r)}
            disabled={r.status === 'running' || r.total_results === 0}
          >
            明细
          </Button>
          <Button type="link" size="small" disabled={r.total_results === 0} onClick={() => exportRun(r.id)}>
            <Auth perm="marketing:geo:export">导出</Auth>
          </Button>
        </Space>
      ),
    },
  ]

  const trendReversed = [...(trend.data ?? [])].reverse()

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Auth perm="marketing:geo:run">
          <Button type="primary" loading={starting} onClick={handleStart}>
            立即监测一轮
          </Button>
        </Auth>
        <Tooltip title="对启用的全部提示词 × 平台各提问一次并打分(20 问 × N 平台,约数分钟)">
          <span style={{ color: '#999' }}>每周一 09:00 自动执行(可在「定时任务」中调整)</span>
        </Tooltip>
      </Space>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', border: '1px solid #f0f0f0', borderRadius: 8, padding: '16px 24px' }}>
          <Statistic title="最新一轮 AI 推荐率" value={latest ? pct(latest.recommend_rate) : '—'} suffix="" />
          <div style={{ color: '#999', fontSize: 12 }}>
            得分 {latest ? `${latest.total_score}/${latest.max_score}` : '-'};提及 {latest?.mentioned_count ?? '-'} 条
          </div>
        </div>
        <div style={{ flex: '1 1 200px', border: '1px solid #f0f0f0', borderRadius: 8, padding: '16px 24px' }}>
          <Statistic title="最新一轮自有引用命中率" value={latest ? pct(latest.own_cite_rate) : '—'} suffix="" />
          <div style={{ color: '#999', fontSize: 12 }}>引用中来自官网域名的占比(周环比看下方趋势)</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Chart
          loading={trend.loading}
          height={280}
          option={lineOption(
            'GEO 指标趋势',
            trendReversed.map((r) => (r.finished_at ?? r.started_at).slice(5, 10)),
            [
              { name: 'AI 推荐率%', data: trendReversed.map((r) => Number((r.recommend_rate * 100).toFixed(1))) },
              { name: '自有引用率%', data: trendReversed.map((r) => Number((r.own_cite_rate * 100).toFixed(1))) },
            ],
          )}
        />
      </div>

      <ProTable<GeoRun>
        rowKey="id"
        headerTitle="监测轮次"
        search={false}
        options={false}
        pagination={false}
        loading={runs.loading}
        dataSource={runs.data?.list ?? []}
        columns={runColumns}
        toolBarRender={() => [
          <Button key="reload" icon={<ReloadOutlined />} onClick={runs.reload}>
            刷新
          </Button>,
        ]}
      />

      <RunDetailDrawer run={detailRun} onClose={() => setDetailRun(null)} />
    </>
  )
}

function RunDetailDrawer({ run, onClose }: { run: GeoRun | null; onClose: () => void }) {
  const [results, setResults] = useState<GeoResultRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!run) return
    setLoading(true)
    listResults(run.id)
      .then((d) => setResults(d.list))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [run])

  const columns: ColumnsType<GeoResultRow> = [
    { title: '平台', dataIndex: 'platform_name', width: 110 },
    { title: '问题', dataIndex: 'prompt_text', ellipsis: true },
    {
      title: '得分',
      dataIndex: 'score',
      width: 90,
      filters: [
        { text: '未提及(0)', value: 0 },
        { text: '提及行简(1)', value: 1 },
        { text: '提及+链接(2)', value: 2 },
      ],
      onFilter: (v, r) => r.score === v,
      render: (v: number, r) => {
        if (r.status !== 'ok') return <Tag color="error">失败</Tag>
        const map = ['未提及', '提及行简', '提及+链接']
        const color = ['default', 'gold', 'green'][v]
        return <Tag color={color}>{map[v] ?? v}</Tag>
      },
    },
    {
      title: '竞品',
      dataIndex: 'competitors',
      width: 160,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '引用',
      dataIndex: 'cited_urls',
      width: 200,
      ellipsis: true,
      render: (v: string, r) => {
        if (!v) return '-'
        let urls: string[] = []
        try {
          urls = JSON.parse(v)
        } catch {
          /* 忽略格式异常 */
        }
        return (
          <Tooltip title={urls.join('\n')}>
            <span>
              {urls.length} 条{r.own_cite ? '(含官网)' : ''}
            </span>
          </Tooltip>
        )
      },
    },
    { title: '耗时', dataIndex: 'latency_ms', width: 90, render: (v: number) => `${(v / 1000).toFixed(1)}s` },
  ]

  return (
    <Drawer
      title={`轮次 #${run?.id ?? ''} 明细`}
      width="min(1100px, 92vw)"
      open={!!run}
      onClose={onClose}
      destroyOnHidden
    >
      {run && (
        <Descriptions size="small" column={4} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="得分">
            {run.total_score} / {run.max_score}
          </Descriptions.Item>
          <Descriptions.Item label="AI 推荐率">{pct(run.recommend_rate)}</Descriptions.Item>
          <Descriptions.Item label="自有引用率">{pct(run.own_cite_rate)}</Descriptions.Item>
          <Descriptions.Item label="提及/带链接">
            {run.mentioned_count} / {run.with_link_count}
          </Descriptions.Item>
        </Descriptions>
      )}
      <Table<GeoResultRow>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={results}
        columns={columns}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        expandable={{
          expandedRowRender: (r) =>
            r.status !== 'ok' ? (
              <div style={{ color: '#cf1322' }}>{r.error_msg || '调用失败'}</div>
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, maxHeight: 320, overflow: 'auto' }}>
                {r.answer || '(无回答)'}
              </pre>
            ),
        }}
      />
    </Drawer>
  )
}

// ── 提示词库 ──

interface PromptFormValues {
  question: string
  group_type: GeoPromptGroup
  enabled: boolean
  sort: number
  remark: string
}

function PromptsTab() {
  const { message } = App.useApp()
  const [form] = Form.useForm<PromptFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GeoPrompt | null>(null)
  const [group, setGroup] = useState<string | undefined>()

  const prompts = useAsync(() => listPrompts({ page: 1, page_size: 100, group_type: group }), [group])

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue({ question: '', group_type: 'category', enabled: true, sort: 0, remark: '' })
    setModalOpen(true)
  }

  const openEdit = (r: GeoPrompt) => {
    setEditing(r)
    form.setFieldsValue({
      question: r.question,
      group_type: r.group_type,
      enabled: r.enabled,
      sort: r.sort,
      remark: r.remark,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: PromptFormValues) => {
    if (editing) {
      await updatePrompt(editing.id, values)
      message.success('已更新')
    } else {
      await createPrompt(values)
      message.success('已新增')
    }
    prompts.reload()
    return true
  }

  const columns: ProColumns<GeoPrompt>[] = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '问题', dataIndex: 'question' },
    {
      title: '分组',
      dataIndex: 'group_type',
      width: 130,
      render: (_, r) => GROUP_LABELS[r.group_type] ?? r.group_type,
    },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (_, r) => (r.enabled ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>),
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作',
      width: 130,
      render: (_, r) => (
        <Space>
          <Auth perm="marketing:geo:prompt:edit">
            <Button type="link" size="small" onClick={() => openEdit(r)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="marketing:geo:prompt:delete">
            <Popconfirm
              title="删除后历史轮次的明细仍保留,确认删除该提示词?"
              onConfirm={async () => {
                await deletePrompt(r.id)
                message.success('已删除')
                prompts.reload()
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
      <ProTable<GeoPrompt>
        rowKey="id"
        headerTitle="提示词库(GEO 手册 Top 20 选题矩阵)"
        search={false}
        options={false}
        pagination={false}
        loading={prompts.loading}
        dataSource={prompts.data?.list ?? []}
        columns={columns}
        toolBarRender={() => [
          <Select
            key="group"
            allowClear
            placeholder="全部分组"
            style={{ width: 150 }}
            value={group}
            onChange={(v) => setGroup(v)}
            options={Object.entries(GROUP_LABELS).map(([value, label]) => ({ value, label }))}
          />,
          <Button key="add" type="primary" onClick={openCreate}>
            <Auth perm="marketing:geo:prompt:add">新增提示词</Auth>
          </Button>,
        ]}
      />
      <ModalForm<PromptFormValues>
        title={editing ? '编辑提示词' : '新增提示词'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true }}
      >
        <ProFormText
          name="question"
          label="监测问题"
          width="lg"
          rules={[{ required: true, message: '请输入完整问题(不是关键词)' }]}
          placeholder="如:有哪些免费的CRM系统推荐?"
        />
        <ProFormDigit name="sort" label="排序" width="xs" />
        <ProFormSelect
          name="group_type"
          label="分组"
          width="md"
          options={Object.entries(GROUP_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <ProFormSwitch name="enabled" label="参与监测" />
        <ProForm.Item name="remark" label="备注">
          <Input placeholder="选题出处/首发渠道等" />
        </ProForm.Item>
      </ModalForm>
    </>
  )
}

// ── 平台管理 ──

interface PlatformFormValues {
  name: string
  base_url: string
  api_key: string
  model: string
  enabled: boolean
  remark: string
}

function PlatformsTab() {
  const { message } = App.useApp()
  const [form] = Form.useForm<PlatformFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GeoPlatform | null>(null)

  const platforms = useAsync(() => listPlatforms())

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue({ name: '', base_url: 'https://api.deepseek.com', api_key: '', model: '', enabled: true, remark: '' })
    setModalOpen(true)
  }

  const openEdit = (r: GeoPlatform) => {
    setEditing(r)
    form.setFieldsValue({
      name: r.name,
      base_url: r.base_url,
      api_key: '',
      model: r.model,
      enabled: r.enabled,
      remark: r.remark,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: PlatformFormValues) => {
    if (editing) {
      await updatePlatform(editing.id, values)
      message.success('已更新')
    } else {
      await createPlatform(values)
      message.success('已新增,记得启用后参与监测')
    }
    platforms.reload()
    return true
  }

  const columns: ProColumns<GeoPlatform>[] = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '平台', dataIndex: 'name', width: 130 },
    { title: 'API 地址', dataIndex: 'base_url', ellipsis: true },
    { title: '模型', dataIndex: 'model', width: 150 },
    {
      title: 'API Key',
      width: 130,
      render: (_, r) => (r.api_key_set ? <Tag color="success">{r.api_key_mask}</Tag> : <Tag color="warning">未配置</Tag>),
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (_, r) => (r.enabled ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>),
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作',
      width: 130,
      render: (_, r) => (
        <Space>
          <Auth perm="marketing:geo:platform:edit">
            <Button type="link" size="small" onClick={() => openEdit(r)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="marketing:geo:platform:delete">
            <Popconfirm
              title="确认删除该平台?(历史轮次明细保留)"
              onConfirm={async () => {
                await deletePlatform(r.id)
                message.success('已删除')
                platforms.reload()
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
      <ProTable<GeoPlatform>
        rowKey="id"
        headerTitle="被监测的 AI 平台(OpenAI 兼容 API)"
        search={false}
        options={false}
        pagination={false}
        loading={platforms.loading}
        dataSource={platforms.data?.list ?? []}
        columns={columns}
        toolBarRender={() => [
          <Button key="add" type="primary" onClick={openCreate}>
            <Auth perm="marketing:geo:platform:add">新增平台</Auth>
          </Button>,
        ]}
      />
      <ModalForm<PlatformFormValues>
        title={editing ? `编辑平台:${editing.name}` : '新增平台'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true }}
      >
        <ProFormText name="name" label="平台名" width="sm" rules={[{ required: true }]} placeholder="如:DeepSeek / 通义千问 / 豆包(方舟)" />
        <ProFormText
          name="model"
          label="模型名"
          width="sm"
          rules={[{ required: true }]}
          placeholder="如:deepseek-chat / qwen-plus"
        />
        <ProFormText
          name="base_url"
          label="API 根地址(OpenAI 兼容)"
          rules={[{ required: true }]}
          placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
        />
        <ProForm.Item
          name="api_key"
          label="API Key"
          extra={editing ? '留空保留原值' : '仅存服务端,页面只显示掩码'}
        >
          <Input.Password placeholder={editing && editing.api_key_set ? editing.api_key_mask : 'sk-...'} />
        </ProForm.Item>
        <ProFormSwitch name="enabled" label="参与监测" />
        <ProForm.Item name="remark" label="备注">
          <Input />
        </ProForm.Item>
      </ModalForm>
    </>
  )
}

export default function GeoMonitor() {
  return (
    <Tabs
      defaultActiveKey="dashboard"
      items={[
        { key: 'dashboard', label: '监测看板', children: <DashboardTab /> },
        { key: 'prompts', label: '提示词库', children: <PromptsTab /> },
        { key: 'platforms', label: '平台管理', children: <PlatformsTab /> },
        { key: 'topics', label: '选题池', children: <TopicsTab /> },
        { key: 'sources', label: '信源库', children: <SourcesTab /> },
      ]}
    />
  )
}
