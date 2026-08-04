import { useEffect, useState } from 'react'
import { App, Button, Card, Form, Popconfirm, Space } from 'antd'
import { ProForm, ProFormDigit, ProFormRadio, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  getStorageConfig,
  reloadStorageDriver,
  testStorageConnection,
  updateStorageConfig,
} from '../../../services/system'
import type { UpdateStorageConfigRequest } from '../../../types'

interface StorageFormValues {
  driver: string
  local_path?: string
  resource_domain?: string
  oss_endpoint?: string
  oss_access_key_id?: string
  oss_access_key_secret?: string
  oss_bucket_name?: string
  oss_custom_domain?: string
  max_upload_mb?: number
  remark?: string
}

export default function StorageConfigPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<StorageFormValues>()
  const driver = Form.useWatch('driver', form)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [reloading, setReloading] = useState(false)

  const loadConfig = async () => {
    const res = await getStorageConfig()
    form.setFieldsValue({
      driver: res.driver || 'local',
      local_path: res.local_path,
      resource_domain: res.resource_domain,
      oss_endpoint: res.oss_endpoint,
      oss_access_key_id: res.oss_access_key_id,
      oss_access_key_secret: res.oss_access_key_secret,
      oss_bucket_name: res.oss_bucket_name,
      oss_custom_domain: res.oss_custom_domain,
      max_upload_mb: res.max_upload_mb,
      remark: res.remark,
    })
  }

  useEffect(() => {
    loadConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (values: StorageFormValues) => {
    setLoading(true)
    try {
      const payload: UpdateStorageConfigRequest = {
        driver: values.driver,
        local_path: values.local_path || undefined,
        resource_domain: values.resource_domain || undefined,
        oss_endpoint: values.oss_endpoint || undefined,
        oss_access_key_id: values.oss_access_key_id || undefined,
        oss_access_key_secret: values.oss_access_key_secret || undefined,
        oss_bucket_name: values.oss_bucket_name || undefined,
        oss_custom_domain: values.oss_custom_domain || undefined,
        max_upload_mb: values.max_upload_mb ?? undefined,
        remark: values.remark || undefined,
      }
      await updateStorageConfig(payload)
      message.success('存储配置已保存')
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      await testStorageConnection()
      message.success('存储连接测试成功')
    } finally {
      setTesting(false)
    }
  }

  const handleReload = async () => {
    setReloading(true)
    try {
      await reloadStorageDriver()
      message.success('上传驱动已重建')
    } finally {
      setReloading(false)
    }
  }

  const ossRequired = driver === 'oss'
  const ossRules = (label: string) =>
    ossRequired ? [{ required: true, message: `请输入${label}` }] : []

  return (
    <Card title="存储配置" style={{ maxWidth: 960 }}>
      <ProForm<StorageFormValues>
        form={form}
        grid
        onFinish={handleSave}
        submitter={{
          render: () => (
            <Space style={{ marginTop: 8 }}>
              <Auth perm="system:storage:save">
                <Button
                  type="primary"
                  loading={loading}
                  onClick={() => form.submit()}
                >
                  保存
                </Button>
              </Auth>
              <Auth perm="system:storage:test">
                <Button loading={testing} onClick={handleTest}>
                  测试连接
                </Button>
              </Auth>
              <Popconfirm
                title="确认重建上传驱动?"
                description="将按当前配置重新初始化上传驱动"
                okText="重建"
                cancelText="取消"
                onConfirm={handleReload}
              >
                <Button danger loading={reloading}>
                  重建驱动
                </Button>
              </Popconfirm>
            </Space>
          ),
        }}
      >
        <ProFormRadio.Group
          name="driver"
          label="存储驱动"
          rules={[{ required: true, message: '请选择存储驱动' }]}
          options={[
            { label: '本地存储', value: 'local' },
            { label: '阿里云 OSS', value: 'oss' },
          ]}
          colProps={{ span: 24 }}
        />
        <ProFormText
          name="local_path"
          label="本地路径"
          placeholder="如 uploads"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="resource_domain"
          label="资源域名"
          placeholder="如 http://localhost:9000/uploads"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="oss_endpoint"
          label="OSS Endpoint"
          placeholder="如 oss-cn-hangzhou.aliyuncs.com"
          rules={ossRules('OSS Endpoint')}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="oss_bucket_name"
          label="Bucket"
          placeholder="Bucket 名称"
          rules={ossRules('Bucket')}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="oss_access_key_id"
          label="AccessKey ID"
          placeholder="阿里云 AccessKey ID"
          rules={ossRules('AccessKey ID')}
          colProps={{ span: 12 }}
        />
        <ProFormText.Password
          name="oss_access_key_secret"
          label="AccessKey Secret"
          placeholder="留空表示不修改"
          rules={ossRules('AccessKey Secret')}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="oss_custom_domain"
          label="自定义域名"
          placeholder="CDN / 自定义访问域名,可选"
          colProps={{ span: 12 }}
        />
        <ProFormDigit
          name="max_upload_mb"
          label="上传上限(MB)"
          min={1}
          fieldProps={{ precision: 0 }}
          placeholder="单个文件大小上限"
          colProps={{ span: 12 }}
        />
        <ProFormTextArea
          name="remark"
          label="备注"
          placeholder="备注信息"
          colProps={{ span: 24 }}
        />
      </ProForm>
    </Card>
  )
}
