import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Popconfirm, Space, Switch, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SettingOutlined } from '@ant-design/icons'
import Auth from '../../../components/Auth'
import {
  getHomepageConfig,
  removeHomepageFeature,
  toggleHomepageModule,
} from '../../../services/system'
import type { HomepageFeature, HomepageModule } from '../../../types'
import SelectModal, { type ModuleKey } from './SelectModal'

export default function HomepageConfigPage() {
  const { message } = App.useApp()
  const [modules, setModules] = useState<HomepageModule[]>([])
  const [loading, setLoading] = useState(false)
  const [modalModule, setModalModule] = useState<{
    key: ModuleKey
    name: string
    selectedIds: number[]
  } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getHomepageConfig()
      setModules(res.list || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggle = async (mod: HomepageModule, enabled: boolean) => {
    await toggleHomepageModule(mod.module, enabled)
    setModules((prev) =>
      prev.map((m) => (m.module === mod.module ? { ...m, enabled } : m)),
    )
    message.success(`${mod.module_name} 已${enabled ? '开启' : '关闭'}`)
  }

  const handleRemove = async (feature: HomepageFeature) => {
    await removeHomepageFeature(feature.id)
    message.success('已移除')
    loadData()
  }

  const openSelect = (mod: HomepageModule) => {
    setModalModule({
      key: mod.module as ModuleKey,
      name: mod.module_name,
      selectedIds: mod.features.map((f) => f.item_id),
    })
  }

  const featureColumns: ColumnsType<HomepageFeature> = [
    { title: '排序', dataIndex: 'sort', width: 60 },
    { title: 'ID', dataIndex: 'item_id', width: 80 },
    { title: '名称', dataIndex: 'item_name', width: 200 },
    { title: '补充信息', dataIndex: 'sub_info', width: 200 },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Auth perm="system:homepage:remove">
          <Popconfirm title="确认移除该条目?" onConfirm={() => handleRemove(record)}>
            <Button type="link" size="small" danger>
              移除
            </Button>
          </Popconfirm>
        </Auth>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      {modules.map((mod) => (
        <Card
          key={mod.module}
          loading={loading}
          title={
            <Space>
              <span>{mod.module_name}</span>
              {mod.enabled ? (
                <Tag color="green">已开启</Tag>
              ) : (
                <Tag>已关闭</Tag>
              )}
            </Space>
          }
          extra={
            <Space>
              <span style={{ fontSize: 13, color: '#666' }}>CMS首页显示</span>
              <Auth perm="system:homepage:toggle">
                <Switch
                  checked={mod.enabled}
                  onChange={(checked) => handleToggle(mod, checked)}
                />
              </Auth>
            </Space>
          }
        >
          <div style={{ marginBottom: 12 }}>
            <Auth perm="system:homepage:sync">
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => openSelect(mod)}
              >
                选择展示项
              </Button>
            </Auth>
            <span style={{ marginLeft: 12, color: '#999', fontSize: 13 }}>
              {mod.features.length > 0
                ? `已精选 ${mod.features.length} 项`
                : '未精选，CMS 首页将展示全部上架/正常项'}
            </span>
          </div>
          <Table<HomepageFeature>
            rowKey="id"
            columns={featureColumns}
            dataSource={mod.features}
            pagination={false}
            size="small"
            locale={{ emptyText: '暂无精选条目' }}
          />
        </Card>
      ))}

      {modalModule && (
        <SelectModal
          open={!!modalModule}
          module={modalModule.key}
          moduleName={modalModule.name}
          selectedIds={modalModule.selectedIds}
          onCancel={() => setModalModule(null)}
          onSuccess={() => {
            setModalModule(null)
            loadData()
          }}
        />
      )}
    </Space>
  )
}
