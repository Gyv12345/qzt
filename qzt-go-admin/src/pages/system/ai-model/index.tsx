import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Popconfirm, Switch, Tag, Tooltip, Typography } from 'antd'
import type { ActionType, ProColumns } from '@ant-design/pro-components'
import { ModalForm, ProFormText, ProFormTextArea, ProTable } from '@ant-design/pro-components'
import { pageIndexColumn } from '../../../components/IndexTag'
import {
  activateAiModel,
  createAiModel,
  deleteAiModel,
  getCurrentAiModel,
  listAiModels,
  updateAiModel,
} from '../../../services/system'
import type { AiCurrentModel, AiModel, AiModelPayload } from '../../../types/ai'

/** 编辑时密钥留空或保持 **** 开头 = 不修改:回传原脱敏值,后端识别 **** 前缀后保留旧密钥 */
const resolveApiKey = (input: string | undefined, editing: AiModel | null): string | undefined => {
  const t = (input ?? '').trim()
  if (t === '' || t.startsWith('****')) return editing?.api_key
  return t
}

interface AiModelFormValues {
  name: string
  base_url: string
  model: string
  api_key?: string
  remark?: string
}

/** AI 模型控制台(P30):统一 LLM 网关的模型档案管理,启用即热切换、无需重启。 */
export default function AiModelPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [list, setList] = useState<AiModel[]>([])
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState<AiCurrentModel | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AiModel | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [models, cur] = await Promise.all([listAiModels(), getCurrentAiModel()])
      setList(models)
      setCurrent(cur)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleActivate = async (record: AiModel) => {
    try {
      await activateAiModel(record.id)
      message.success(`已启用「${record.name}」,后续 AI 对话与场景将使用该模型`)
      await load()
    } catch {
      /* 失败提示已由请求层统一弹出 */
    }
  }

  const handleDelete = async (record: AiModel) => {
    try {
      await deleteAiModel(record.id)
      message.success('模型档案已删除')
      await load()
    } catch {
      /* 默认档案后端会拒绝,提示已由请求层统一弹出 */
    }
  }

  /** 编辑时密钥字段的 extra 提示(展示已保存脱敏值的尾 4 位) */
  const apiKeyExtra = () => {
    if (!editing?.api_key) return undefined
    return `已保存(尾4位 ${editing.api_key.slice(-4)}),留空或保持 **** 开头则不修改`
  }

  const columns: ProColumns<AiModel>[] = [
    pageIndexColumn<AiModel>(actionRef, { width: 70 }),
    { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
    {
      title: '端点',
      dataIndex: 'base_url',
      width: 260,
      ellipsis: true,
      render: (_, r) => (
        <Typography.Text type="secondary" style={{ fontSize: 13 }} ellipsis>
          {r.base_url}
        </Typography.Text>
      ),
    },
    {
      title: '模型标识',
      dataIndex: 'model',
      width: 180,
      ellipsis: true,
      render: (_, r) => <Typography.Text code copyable={false}>{r.model}</Typography.Text>,
    },
    {
      title: '密钥',
      dataIndex: 'api_key',
      width: 110,
      render: (_, r) => <Typography.Text code copyable={false}>{r.api_key || '-'}</Typography.Text>,
    },
    {
      title: '默认',
      dataIndex: 'is_default',
      width: 80,
      render: (_, r) => (!!r.is_default ? <Tag color="green">默认</Tag> : '-'),
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (_, r) => <Switch size="small" checked={!!r.enabled} disabled />,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 170,
      fixed: 'right',
      render: (_, record) => {
        const isDefault = !!record.is_default
        // 后端规则:enabled=0 的档案不可激活(「已停用的档案不可启用」)
        const stopped = record.enabled !== 1
        return [
          <Button
            key="edit"
            type="link"
            size="small"
            onClick={() => {
              setEditing(record)
              setModalOpen(true)
            }}
          >
            编辑
          </Button>,
          <Tooltip key="activate" title={stopped ? '该档案已停用,不可启用' : undefined}>
            <Popconfirm
              title="确认启用该模型?"
              description="切换后立即生效,后续 AI 对话与场景将使用该模型"
              onConfirm={() => handleActivate(record)}
              disabled={isDefault || stopped}
            >
              <Button type="link" size="small" disabled={isDefault || stopped}>
                启用
              </Button>
            </Popconfirm>
          </Tooltip>,
          <Tooltip key="delete" title={isDefault ? '默认档案不可删除' : undefined}>
            <Popconfirm
              title="确认删除该模型档案?"
              description="删除后不可恢复,不影响当前生效模型"
              onConfirm={() => handleDelete(record)}
              disabled={isDefault}
            >
              <Button type="link" size="small" danger disabled={isDefault}>
                删除
              </Button>
            </Popconfirm>
          </Tooltip>,
        ]
      },
    },
  ]

  /** 顶部 Alert:当前生效模型(source=env 时提示先录入档案再启用) */
  const renderCurrentAlert = () => {
    if (!current) return null
    if (current.source === 'db' && current.name) {
      return (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              当前生效模型:<b>{current.name}</b>
              {current.model ? <Tag color="green" style={{ marginLeft: 8 }}>{current.model}</Tag> : null}
            </span>
          }
          description={current.base_url ? `端点:${current.base_url}` : undefined}
        />
      )
    }
    return (
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="当前使用环境变量配置"
        description={
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <div>
              AI 能力当前由服务器环境变量(LLM_API_KEY 等)提供。录入模型档案并启用后即可切换到库内档案,热切换立即生效、无需重启。
            </div>
            {(current.model || current.base_url) && (
              <div style={{ color: 'rgba(0,0,0,0.65)' }}>
                {current.model ? <>生效模型:{current.model}</> : null}
                {current.model && current.base_url ? <span style={{ margin: '0 8px' }}>·</span> : null}
                {current.base_url ? <>端点:{current.base_url}</> : null}
              </div>
            )}
            {current.api_key === '' && (
              <div style={{ color: '#d46b08' }}>环境变量未配置 API Key,AI 功能暂不可用。</div>
            )}
          </div>
        }
      />
    )
  }

  return (
    <div>
      {renderCurrentAlert()}

      <ProTable<AiModel>
        headerTitle="AI 模型档案"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        search={false}
        pagination={false}
        options={false}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            新建模型
          </Button>,
        ]}
      />

      <ModalForm<AiModelFormValues>
        key={editing?.id ?? 'create'}
        title={editing ? `编辑模型:${editing.name}` : '新建 AI 模型'}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setEditing(null)
        }}
        modalProps={{ destroyOnHidden: true, width: 640, maskClosable: false }}
        grid
        initialValues={{
          name: editing?.name,
          base_url: editing?.base_url,
          model: editing?.model,
          // 密钥不回填,编辑时留空表示不修改
          api_key: '',
          remark: editing?.remark,
        }}
        onFinish={async (values) => {
          const payload: AiModelPayload = {
            name: values.name.trim(),
            base_url: values.base_url.trim(),
            model: values.model.trim(),
            // 编辑时留空/保持 **** 开头 = 不修改(回传原脱敏值)
            api_key: resolveApiKey(values.api_key, editing),
            remark: values.remark,
          }
          if (editing) {
            await updateAiModel(editing.id, payload)
            message.success('模型档案已更新')
          } else {
            await createAiModel(payload)
            message.success('模型档案已创建')
          }
          setModalOpen(false)
          await load()
          return true
        }}
      >
        <ProFormText
          name="name"
          label="模型名称"
          placeholder="如 DeepSeek / 通义千问 / GPT-4o"
          rules={[{ required: true, message: '请输入模型名称' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="model"
          label="模型标识"
          placeholder="如 deepseek-chat / qwen-plus / gpt-4o-mini"
          tooltip="调用 API 时使用的 model 参数,以服务商文档为准"
          rules={[{ required: true, message: '请输入模型标识' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="base_url"
          label="API 端点"
          placeholder="https://api.deepseek.com/v1"
          extra="OpenAI 兼容端点,如 https://api.deepseek.com/v1"
          tooltip="后端会在该地址后拼接 /chat/completions,一般填到 /v1 为止;仅支持公网 http/https 地址(拒绝内网/环回)"
          rules={[
            { required: true, message: '请输入 API 端点' },
            { pattern: /^https?:\/\/.+/, message: '须以 http:// 或 https:// 开头' },
          ]}
          colProps={{ span: 24 }}
        />
        <ProFormText.Password
          name="api_key"
          label="API 密钥"
          placeholder={editing ? '留空表示不修改' : '服务商提供的 API Key'}
          extra={apiKeyExtra()}
          rules={[
            ...(editing
              ? []
              : [
                  { required: true, message: '请输入 API 密钥' },
                  {
                    // 新建时粘贴脱敏值会被后端原样入库,前端直接拦下
                    validator: (_rule: unknown, value?: string) =>
                      (value ?? '').trim().startsWith('****')
                        ? Promise.reject(new Error('请输入完整密钥,不能使用脱敏值(**** 开头)'))
                        : Promise.resolve(),
                  },
                ]),
          ]}
          colProps={{ span: 24 }}
        />
        <ProFormTextArea
          name="remark"
          label="备注"
          placeholder="备注信息(选填)"
          fieldProps={{ rows: 2 }}
          colProps={{ span: 24 }}
        />
      </ModalForm>
    </div>
  )
}
