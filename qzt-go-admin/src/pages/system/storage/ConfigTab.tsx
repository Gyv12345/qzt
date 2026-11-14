import { useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Popconfirm, Tag, Tooltip } from 'antd'
import type { ActionType, ProColumns } from '@ant-design/pro-components'
import {
  ModalForm,
  ProFormDependency,
  ProFormDigit,
  ProFormRadio,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components'
import { pageIndexColumn } from '../../../components/IndexTag'
import {
  activateStorageConfig,
  createStorageConfig,
  deleteStorageConfig,
  listStorageConfigs,
  testStorageConfig,
  updateStorageConfig,
} from '../../../services/system'
import type { StorageConfig, StorageConfigPayload, StorageDriver } from '../../../types/storage'

/** 驱动展示元信息 */
const DRIVER_META: Record<StorageDriver, { label: string; color: string }> = {
  local: { label: '本地磁盘', color: 'blue' },
  oss: { label: '阿里云 OSS', color: 'orange' },
  s3: { label: 'S3 兼容', color: 'purple' },
}

const DRIVER_OPTIONS: { label: string; value: StorageDriver }[] = [
  { label: '本地磁盘(local)', value: 'local' },
  { label: '阿里云 OSS', value: 'oss' },
  { label: 'S3 兼容(MinIO/七牛/腾讯COS 等)', value: 's3' },
]

/** 列表「关键参数」列:按驱动取最能识别该配置的参数 */
const summaryText = (r: StorageConfig) => {
  if (r.driver === 'local') return r.resource_domain || r.local_path || '-'
  if (r.driver === 's3') return [r.s3_bucket_public, r.s3_endpoint].filter(Boolean).join(' @ ') || '-'
  return [r.oss_bucket_name, r.oss_endpoint].filter(Boolean).join(' @ ') || '-'
}

/** 密钥留空或保持 **** 开头 = 不修改(传 undefined 让后端保留原值) */
const normalizeSecret = (v?: string) => {
  const t = (v ?? '').trim()
  return t === '' || t.startsWith('****') ? undefined : t
}

interface StorageFormValues {
  name: string
  driver: StorageDriver
  max_upload_mb: number
  remark?: string
  local_path?: string
  private_path?: string
  resource_domain?: string
  download_prefix?: string
  oss_endpoint?: string
  oss_access_key_id?: string
  oss_access_key_secret?: string
  oss_bucket_name?: string
  oss_custom_domain?: string
  oss_private_bucket_name?: string
  oss_private_custom_domain?: string
  s3_endpoint?: string
  s3_region?: string
  s3_bucket_public?: string
  s3_domain_public?: string
  s3_bucket_private?: string
  s3_domain_private?: string
  s3_access_key?: string
  s3_secret_key?: string
  s3_path_style?: boolean
}

/** Tab1 存储配置:多套存储统一管理,同一时刻仅一条生效 */
export default function ConfigTab() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [list, setList] = useState<StorageConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<StorageConfig | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setList(await listStorageConfigs())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleActivate = async (record: StorageConfig) => {
    try {
      await activateStorageConfig(record.id)
      message.success(`已启用「${record.name}」,新上传立即走新存储`)
      await load()
    } catch {
      /* 失败提示已由请求层统一弹出 */
    }
  }

  const handleTest = async (record: StorageConfig) => {
    try {
      await testStorageConfig(record.id)
      message.success(`「${record.name}」连接测试通过`)
    } catch {
      /* 失败提示已由请求层统一弹出 */
    }
  }

  const handleDelete = async (record: StorageConfig) => {
    try {
      await deleteStorageConfig(record.id)
      message.success('配置已删除')
      await load()
    } catch {
      /* 生效中配置后端会拒绝,提示已由请求层统一弹出 */
    }
  }

  /** 编辑时密钥字段的 extra 提示(展示已保存脱敏值的尾 4 位) */
  const secretExtra = (masked?: string) => {
    if (!editing || !masked || !masked.startsWith('****')) return undefined
    return `已保存(尾4位 ${masked.slice(-4)}),留空或保持 **** 开头则不修改`
  }

  const openEdit = (record: StorageConfig) => {
    setEditing(record)
    setModalOpen(true)
  }

  const columns: ProColumns<StorageConfig>[] = [
    pageIndexColumn<StorageConfig>(actionRef, { width: 70 }),
    { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
    {
      title: '驱动',
      dataIndex: 'driver',
      width: 120,
      render: (_, r) => {
        const meta = DRIVER_META[r.driver]
        return <Tag color={meta?.color ?? 'default'}>{meta?.label ?? r.driver}</Tag>
      },
    },
    {
      title: '关键参数',
      dataIndex: 'summary',
      width: 280,
      ellipsis: true,
      render: (_, r) => summaryText(r),
    },
    {
      title: '单文件上限',
      dataIndex: 'max_upload_mb',
      width: 110,
      render: (_, r) => `${r.max_upload_mb ?? '-'} MB`,
    },
    {
      title: '是否生效',
      dataIndex: 'is_active',
      width: 100,
      render: (_, r) => (!!r.is_active ? <Tag color="green">生效中</Tag> : <Tag>未生效</Tag>),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 230,
      fixed: 'right',
      render: (_, record) => {
        const active = !!record.is_active
        return [
          <Button key="edit" type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>,
          <Button key="test" type="link" size="small" onClick={() => handleTest(record)}>
            测试连接
          </Button>,
          <Popconfirm
            key="activate"
            title="确认启用该配置?"
            description="切换后新上传立即走新存储,存量文件地址不受影响,无需重启"
            onConfirm={() => handleActivate(record)}
            disabled={active}
          >
            <Button type="link" size="small" disabled={active}>
              启用
            </Button>
          </Popconfirm>,
          <Tooltip key="delete" title={active ? '生效中的配置不可删除' : undefined}>
            <Popconfirm
              title="确认删除该配置?"
              description="删除后不可恢复;不影响已上传的存量文件"
              onConfirm={() => handleDelete(record)}
              disabled={active}
            >
              <Button type="link" size="small" danger disabled={active}>
                删除
              </Button>
            </Popconfirm>
          </Tooltip>,
        ]
      },
    },
  ]

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="存储配置说明"
        description={
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            同一时刻仅一个配置生效;切换仅影响新上传,存量文件地址不受影响、无需重启。
            S3 兼容协议可接七牛 / MinIO / RustFS / 腾讯 COS / 阿里云 OSS(S3 端点) 等对象存储。
          </div>
        }
      />

      <ProTable<StorageConfig>
        headerTitle="存储配置"
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
            新建配置
          </Button>,
        ]}
      />

      <ModalForm<StorageFormValues>
        key={editing?.id ?? 'create'}
        title={editing ? `编辑配置:${editing.name}` : '新建存储配置'}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setEditing(null)
        }}
        modalProps={{ destroyOnHidden: true, width: 720, maskClosable: false }}
        grid
        initialValues={{
          name: editing?.name,
          driver: editing?.driver ?? 'local',
          max_upload_mb: editing?.max_upload_mb ?? 20,
          remark: editing?.remark,
          local_path: editing?.local_path,
          private_path: editing?.private_path,
          resource_domain: editing?.resource_domain,
          download_prefix: editing?.download_prefix,
          oss_endpoint: editing?.oss_endpoint,
          oss_access_key_id: '',
          oss_access_key_secret: '',
          oss_bucket_name: editing?.oss_bucket_name,
          oss_custom_domain: editing?.oss_custom_domain,
          oss_private_bucket_name: editing?.oss_private_bucket_name,
          oss_private_custom_domain: editing?.oss_private_custom_domain,
          s3_endpoint: editing?.s3_endpoint,
          s3_region: editing?.s3_region,
          s3_bucket_public: editing?.s3_bucket_public,
          s3_domain_public: editing?.s3_domain_public,
          s3_bucket_private: editing?.s3_bucket_private,
          s3_domain_private: editing?.s3_domain_private,
          s3_access_key: '',
          s3_secret_key: '',
          s3_path_style: !!editing?.s3_path_style,
        }}
        onFinish={async (values) => {
          const payload: StorageConfigPayload = {
            name: values.name,
            driver: values.driver,
            max_upload_mb: values.max_upload_mb,
            remark: values.remark,
            local_path: values.local_path,
            private_path: values.private_path,
            resource_domain: values.resource_domain,
            download_prefix: values.download_prefix,
            oss_endpoint: values.oss_endpoint,
            // 密钥留空或保持 **** 开头 = 不修改
            oss_access_key_id: normalizeSecret(values.oss_access_key_id),
            oss_access_key_secret: normalizeSecret(values.oss_access_key_secret),
            oss_bucket_name: values.oss_bucket_name,
            oss_custom_domain: values.oss_custom_domain,
            oss_private_bucket_name: values.oss_private_bucket_name,
            oss_private_custom_domain: values.oss_private_custom_domain,
            s3_endpoint: values.s3_endpoint,
            s3_region: values.s3_region,
            s3_bucket_public: values.s3_bucket_public,
            s3_domain_public: values.s3_domain_public,
            s3_bucket_private: values.s3_bucket_private,
            s3_domain_private: values.s3_domain_private,
            s3_access_key: normalizeSecret(values.s3_access_key),
            s3_secret_key: normalizeSecret(values.s3_secret_key),
            s3_path_style: !!values.s3_path_style,
          }
          if (editing) {
            await updateStorageConfig(editing.id, payload)
            message.success('配置已更新')
          } else {
            await createStorageConfig(payload)
            message.success('配置已创建')
          }
          setModalOpen(false)
          await load()
          return true
        }}
      >
        <ProFormText
          name="name"
          label="配置名称"
          placeholder="如 生产-OSS / 本地开发盘"
          rules={[{ required: true, message: '请输入配置名称' }]}
          colProps={{ span: 12 }}
        />
        <ProFormDigit
          name="max_upload_mb"
          label="单文件上限(MB)"
          min={1}
          fieldProps={{ precision: 0 }}
          rules={[{ required: true, message: '请输入单文件上限' }]}
          colProps={{ span: 12 }}
        />
        <ProFormRadio.Group name="driver" label="存储驱动" options={DRIVER_OPTIONS} colProps={{ span: 24 }} />

        <ProFormDependency name={['driver']}>
          {({ driver }: { driver?: StorageDriver }) => (
            <>
              {driver === 'local' && (
                <>
                  <ProFormText
                    name="local_path"
                    label="公共目录"
                    placeholder="./storage/public"
                    tooltip="公共文件存储根目录,由 nginx 静态 serve"
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="private_path"
                    label="私有目录"
                    placeholder="./storage/private"
                    tooltip="私有文件存储根目录,由后端代理鉴权访问"
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="resource_domain"
                    label="资源域名"
                    placeholder="https://cdn.example.com"
                    tooltip="公共文件的访问域名,留空则走后端下载接口"
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="download_prefix"
                    label="下载前缀"
                    placeholder="/prod-api/api/file/dl"
                    tooltip="私有文件代理下载 URL 前缀"
                    colProps={{ span: 12 }}
                  />
                </>
              )}

              {driver === 'oss' && (
                <>
                  <ProFormText
                    name="oss_endpoint"
                    label="Endpoint"
                    placeholder="oss-cn-hangzhou.aliyuncs.com"
                    rules={[{ required: true, message: '请输入 Endpoint' }]}
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="oss_bucket_name"
                    label="公共桶"
                    placeholder="public-read 桶名"
                    rules={[{ required: true, message: '请输入公共桶名' }]}
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="oss_access_key_id"
                    label="AccessKeyID"
                    placeholder={editing ? '留空表示不修改' : '阿里云 AccessKey ID'}
                    extra={secretExtra(editing?.oss_access_key_id)}
                    rules={editing ? [] : [{ required: true, message: '请输入 AccessKeyID' }]}
                    colProps={{ span: 12 }}
                  />
                  <ProFormText.Password
                    name="oss_access_key_secret"
                    label="AccessKeySecret"
                    placeholder={editing ? '留空表示不修改' : '阿里云 AccessKey Secret'}
                    extra={secretExtra(editing?.oss_access_key_secret)}
                    rules={editing ? [] : [{ required: true, message: '请输入 AccessKeySecret' }]}
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="oss_custom_domain"
                    label="公共桶 CDN 域名"
                    placeholder="https://cdn.example.com"
                    tooltip="留空则使用桶默认域名"
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="oss_private_bucket_name"
                    label="私有桶"
                    placeholder="private 桶名"
                    tooltip="留空则禁用私有附件"
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="oss_private_custom_domain"
                    label="私有桶域名"
                    placeholder="一般留空"
                    tooltip="私有桶自定义域名,一般留空"
                    colProps={{ span: 12 }}
                  />
                </>
              )}

              {driver === 's3' && (
                <>
                  <ProFormText
                    name="s3_endpoint"
                    label="Endpoint"
                    placeholder="https://s3.example.com 或 https://cos.ap-guangzhou.myqcloud.com"
                    rules={[{ required: true, message: '请输入 Endpoint' }]}
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="s3_region"
                    label="Region"
                    placeholder="如 us-east-1 / ap-guangzhou"
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="s3_bucket_public"
                    label="公共桶"
                    placeholder="public-read 桶名"
                    rules={[{ required: true, message: '请输入公共桶名' }]}
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="s3_domain_public"
                    label="公共桶 CDN 域名"
                    placeholder="https://cdn.example.com"
                    tooltip="留空则用 endpoint/bucket 拼 URL"
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="s3_access_key"
                    label="AccessKey"
                    placeholder={editing ? '留空表示不修改' : 'S3 AccessKey'}
                    extra={secretExtra(editing?.s3_access_key)}
                    rules={editing ? [] : [{ required: true, message: '请输入 AccessKey' }]}
                    colProps={{ span: 12 }}
                  />
                  <ProFormText.Password
                    name="s3_secret_key"
                    label="SecretKey"
                    placeholder={editing ? '留空表示不修改' : 'S3 SecretKey'}
                    extra={secretExtra(editing?.s3_secret_key)}
                    rules={editing ? [] : [{ required: true, message: '请输入 SecretKey' }]}
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="s3_bucket_private"
                    label="私有桶"
                    placeholder="private 桶名"
                    tooltip="留空则禁用私有附件"
                    colProps={{ span: 12 }}
                  />
                  <ProFormText
                    name="s3_domain_private"
                    label="私有桶域名"
                    placeholder="一般留空"
                    tooltip="私有桶自定义域名(签名 URL 用),一般留空"
                    colProps={{ span: 12 }}
                  />
                  <ProFormSwitch
                    name="s3_path_style"
                    label="PathStyle 路径风格"
                    tooltip="MinIO/RustFS/七牛等自建 S3 需开启"
                    colProps={{ span: 12 }}
                  />
                </>
              )}
            </>
          )}
        </ProFormDependency>

        <ProFormTextArea name="remark" label="备注" placeholder="备注信息" colProps={{ span: 24 }} />
      </ModalForm>
    </div>
  )
}
