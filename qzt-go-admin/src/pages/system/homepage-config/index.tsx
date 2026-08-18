import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Popconfirm, Space, Switch, Table, Tabs, Tag } from 'antd'
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

/** 板块 Tab 顺序 */
const TAB_ITEMS: { key: ModuleKey; label: string }[] = [
  { key: 'product', label: '产品' },
  { key: 'partner', label: '合作伙伴' },
  { key: 'team', label: '团队成员' },
]

export default function HomepageConfigPage() {
  const { message } = App.useApp()
  const [modules, setModules] = useState<HomepageModule[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<ModuleKey>('product')
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
    { title: '序号', width: 60, render: (_, __, index) => index + 1 },
    { title: '名称', dataIndex: 'item_name' },
    { title: '补充信息', dataIndex: 'sub_info' },
    { title: '排序', dataIndex: 'sort', width: 70 },
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
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as ModuleKey)}
        items={TAB_ITEMS.map(({ key, label }) => {
          const mod = modules.find((m) => m.module === key)
          return {
            key,
            label: (
              <Space size={6}>
                {label}
                {mod && <Tag color={mod.enabled ? 'green' : undefined}>{mod.enabled ? '已开启' : '已关闭'}</Tag>}
              </Space>
            ),
            children: (
              <Card
                loading={loading}
                title={`${label}板块`}
                extra={
                  <Space>
                    <span style={{ fontSize: 13, color: '#666' }}>在官网展示</span>
                    <Auth perm="system:homepage:toggle">
                      <Switch
                        checked={mod?.enabled}
                        onChange={(checked) => mod && handleToggle(mod, checked)}
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
                      onClick={() => mod && openSelect(mod)}
                    >
                      选择展示项
                    </Button>
                  </Auth>
                  <span style={{ marginLeft: 12, color: '#999', fontSize: 13 }}>
                    {mod && mod.features.length > 0
                      ? `已精选 ${mod.features.length} 项,按勾选顺序展示${key === 'product' ? '(官网首页只展示前 6 项,单页可看全部)' : ''}`
                      : '未精选，官网将展示全部上架/正常项'}
                  </span>
                </div>
                <Table<HomepageFeature>
                  rowKey="id"
                  columns={featureColumns}
                  dataSource={mod?.features}
                  pagination={false}
                  size="small"
                  locale={{ emptyText: '暂无精选条目' }}
                />
              </Card>
            ),
          }
        })}
      />

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
