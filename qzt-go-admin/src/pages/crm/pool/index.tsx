import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import PoolPickRuleModal from '../components/PoolPickRuleModal'
import PoolRecycleRuleModal from '../components/PoolRecycleRuleModal'
import { parseIdArray } from '../components/poolForm'
import { usePoolNameMaps } from '../components/usePoolNameMaps'
import { deleteCustomerPool, listCustomerPools, recyclePool, setPoolPickRule, setPoolRecycleRule } from '../../../services/crm'
import type { CrmCustomerPool } from '../../../types/crm'
import PoolEditModal from './PoolEditModal'
import { pageIndexColumn } from '../../../components/IndexTag'

/** 客户公海池管理:池配置 + 领取/回收规则 + 手动回收 */
export default function PoolPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const { deptName, roleName, userName } = usePoolNameMaps()
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<CrmCustomerPool | null>(null)
  const [currentPool, setCurrentPool] = useState<CrmCustomerPool | null>(null)
  const [pickRuleOpen, setPickRuleOpen] = useState(false)
  const [recycleRuleOpen, setRecycleRuleOpen] = useState(false)

  const reload = () => actionRef.current?.reload()

  const openCreate = () => {
    setEditing(null)
    setEditOpen(true)
  }

  const openEdit = (record: CrmCustomerPool) => {
    setEditing(record)
    setEditOpen(true)
  }

  const handleDelete = async (record: CrmCustomerPool) => {
    await deleteCustomerPool(record.id)
    message.success('公海池已删除')
    reload()
  }

  const handleRecycle = async (record: CrmCustomerPool) => {
    await recyclePool(record.id)
    message.success('已按回收规则执行回收')
    reload()
  }

  const columns: ProColumns<CrmCustomerPool>[] = [
    pageIndexColumn(actionRef),
    {
      title: '名称',
      dataIndex: 'name',
      width: 160,
      render: (_, r) => (
        <Space size={4}>
          {r.name}
          {r.is_default === 1 ? <Tag color="blue">默认</Tag> : null}
        </Space>
      ),
    },
    {
      title: '适用范围',
      key: 'scope',
      width: 220,
      render: (_, r) => {
        const parts: string[] = []
        const deptIds = parseIdArray(r.scope_dept_ids)
        const roleIds = parseIdArray(r.scope_role_ids)
        if (deptIds.length) parts.push(`部门 ${deptIds.map(deptName).join('、')}`)
        if (roleIds.length) parts.push(`角色 ${roleIds.map(roleName).join('、')}`)
        return parts.length ? parts.join(';') : '全部'
      },
    },
    {
      title: '管理员',
      dataIndex: 'admin_user_ids',
      width: 180,
      render: (_, r) => {
        const names = parseIdArray(r.admin_user_ids).map(userName)
        return names.length ? names.join('、') : '-'
      },
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (_, r) => (r.enabled === 1 ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>),
    },
    {
      title: '自动回收',
      dataIndex: 'auto_recycle',
      width: 90,
      render: (_, r) => (r.auto_recycle === 1 ? <Tag color="green">开启</Tag> : <Tag>关闭</Tag>),
    },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 300,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} wrap>
          <Auth perm="crm:pool:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="crm:pool:edit">
            <Button
              type="link"
              size="small"
              onClick={() => {
                setCurrentPool(record)
                setPickRuleOpen(true)
              }}
            >
              领取规则
            </Button>
          </Auth>
          <Auth perm="crm:pool:edit">
            <Button
              type="link"
              size="small"
              onClick={() => {
                setCurrentPool(record)
                setRecycleRuleOpen(true)
              }}
            >
              回收规则
            </Button>
          </Auth>
          <Auth perm="crm:pool:recycle">
            <Popconfirm
              title="立即按回收规则执行一次回收?"
              okText="执行"
              cancelText="取消"
              onConfirm={() => handleRecycle(record)}
            >
              <Button type="link" size="small">
                手动回收
              </Button>
            </Popconfirm>
          </Auth>
          {record.is_default !== 1 && (
            <Auth perm="crm:pool:delete">
              <Popconfirm
                title="确认删除该公海池?"
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
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<CrmCustomerPool>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        pagination={false}
        request={async () => ({ data: await listCustomerPools(), success: true })}
        toolBarRender={() => [
          <Auth perm="crm:pool:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增公海池
            </Button>
          </Auth>,
        ]}
        headerTitle="公海池列表"
      />
      <PoolEditModal open={editOpen} editing={editing} onOpenChange={setEditOpen} onSuccess={reload} />
      {currentPool && (
        <>
          <PoolPickRuleModal
            open={pickRuleOpen}
            poolId={currentPool.id}
            poolName={currentPool.name}
            onOpenChange={setPickRuleOpen}
            onSuccess={reload}
            onSave={setPoolPickRule}
          />
          <PoolRecycleRuleModal
            open={recycleRuleOpen}
            poolId={currentPool.id}
            poolName={currentPool.name}
            onOpenChange={setRecycleRuleOpen}
            onSuccess={reload}
            onSave={setPoolRecycleRule}
          />
        </>
      )}
    </>
  )
}
