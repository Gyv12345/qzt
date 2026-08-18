import { useEffect, useMemo, useState } from 'react'
import { App, Button, Input, Popconfirm, Space, Spin, Tag, Tree } from 'antd'
import { PlusOutlined, SwapOutlined } from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import { ProTable, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteUser, listAllUsers } from '../../../services/system'
import { getDepartmentTree } from '../../../services/hrm'
import type { HrmDepartment } from '../../../types/hrm'
import type { SysUser } from '../../../types'
import { maskPhone, maskEmail } from '../../../utils/mask'
import { ALL_DEPT_KEY, NONE_DEPT_KEY, collectDeptAndSub, deptToTreeNodes } from './deptTree'
import UserEditModal from './UserEditModal'
import HandoverModal from './HandoverModal'
import ResetPasswordModal from './ResetPasswordModal'
import './index.css'

/** 系统用户管理:左侧部门树 + 右侧用户表格(前端按部门/关键词过滤) */
export default function UserPage() {
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SysUser | null>(null)
  const [deptTree, setDeptTree] = useState<HrmDepartment[]>([])
  const [treeNodes, setTreeNodes] = useState<DataNode[]>([])
  const [treeLoading, setTreeLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState<number>(ALL_DEPT_KEY)

  // 全量用户缓存(供左侧部门树前端过滤用)
  const [allUsers, setAllUsers] = useState<SysUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  // 离职交接
  const [handoverTarget, setHandoverTarget] = useState<SysUser | null>(null)
  // 重置密码
  const [resetPwdTarget, setResetPwdTarget] = useState<SysUser | null>(null)
  const [keyword, setKeyword] = useState('')

  // 拉全量用户(供前端按部门/关键词过滤)
  const reloadUsers = async () => {
    setUsersLoading(true)
    try {
      const list = await listAllUsers()
      setAllUsers(list)
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    setTreeLoading(true)
    getDepartmentTree()
      .then((tree) => {
        setDeptTree(tree)
        setTreeNodes(deptToTreeNodes(tree))
      })
      .catch(() => {})
      .finally(() => setTreeLoading(false))
    reloadUsers()
  }, [])

  // 部门名映射
  const deptNameMap = useMemo(() => {
    const map = new Map<number, string>()
    const walk = (list: HrmDepartment[]) => {
      for (const d of list) {
        map.set(d.id, d.name)
        if (d.children?.length) walk(d.children)
      }
    }
    walk(deptTree)
    return map
  }, [deptTree])

  // 按选中部门 + 关键词过滤后的用户列表
  const filteredUsers = useMemo(() => {
    let list = allUsers
    if (selectedKey === NONE_DEPT_KEY) {
      list = list.filter((u) => u.dept_id == null)
    } else if (selectedKey !== ALL_DEPT_KEY) {
      const ids = collectDeptAndSub(deptTree, selectedKey)
      list = list.filter((u) => u.dept_id != null && ids.has(u.dept_id))
    }
    const kw = keyword.trim().toLowerCase()
    if (kw) {
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(kw) ||
          u.nickname.toLowerCase().includes(kw) ||
          (u.email || '').toLowerCase().includes(kw) ||
          (u.phone || '').toLowerCase().includes(kw),
      )
    }
    return list
  }, [allUsers, selectedKey, deptTree, keyword])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (record: SysUser) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleDelete = async (record: SysUser) => {
    await deleteUser(record.id)
    message.success('用户已删除')
    reloadUsers()
  }

  const columns: ProColumns<SysUser>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70 },
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '昵称', dataIndex: 'nickname', width: 120 },
    {
      title: '部门',
      dataIndex: 'dept_id',
      width: 140,
      render: (_, r) => (r.dept_id ? deptNameMap.get(r.dept_id) ?? `#${r.dept_id}` : <Tag>未分配</Tag>),
    },
    { title: '邮箱', dataIndex: 'email', width: 180, render: (_, r) => maskEmail(r.email) || '-' },
    { title: '手机号', dataIndex: 'phone', width: 130, render: (_, r) => maskPhone(r.phone) || '-' },
    {
      title: '角色',
      dataIndex: 'roles',
      width: 160,
      render: (_, r) =>
        r.roles?.length ? (
          <>
            {r.roles.map((role) => (
              <Tag color="blue" key={role.id}>
                {role.name}
              </Tag>
            ))}
          </>
        ) : (
          '-'
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      valueEnum: {
        1: { text: '正常', status: 'Success' },
        0: { text: '停用', status: 'Default' },
      },
    },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="system:user:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="system:user:resetPwd">
            {record.id !== 1 && (
              <Button type="link" size="small" onClick={() => setResetPwdTarget(record)}>
                重置密码
              </Button>
            )}
          </Auth>
          {record.username !== 'admin' && (
            <Button
              type="link"
              size="small"
              icon={<SwapOutlined />}
              onClick={() => {
                setHandoverTarget(record)
              }}
            >
              交接
            </Button>
          )}
          {record.id !== 1 && (
            <Auth perm="system:user:delete">
              <Popconfirm
                title="确认删除该用户?"
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

  // 当前选中的部门标题(用于右侧表格 headerTitle)
  const currentDeptTitle =
    selectedKey === ALL_DEPT_KEY
      ? '全部'
      : selectedKey === NONE_DEPT_KEY
        ? '未分配部门'
        : deptNameMap.get(selectedKey) ?? `部门#${selectedKey}`

  return (
    <div className="qzt-user-layout">
      {/* 左侧:部门树 */}
      <div className="qzt-user-sider">
        <div className="qzt-user-sider-header">
          <span>组织部门</span>
        </div>
        <Spin spinning={treeLoading}>
          <Tree
            blockNode
            defaultExpandAll
            defaultSelectedKeys={[ALL_DEPT_KEY]}
            treeData={treeNodes}
            onSelect={(keys) => {
              const key = keys[0]
              if (typeof key === 'number') setSelectedKey(key)
            }}
          />
        </Spin>
      </div>

      {/* 右侧:用户表格 */}
      <div className="qzt-user-main">
        <ProTable<SysUser>
          rowKey="id"
          columns={columns}
          scroll={{ x: 'max-content' }}
          search={false}
          loading={usersLoading}
          dataSource={filteredUsers}
          pagination={{ defaultPageSize: 10, showSizeChanger: true }}
          toolBarRender={() => [
            <Input.Search
              key="search"
              allowClear
              placeholder="用户名/昵称/邮箱/手机号"
              style={{ width: 240 }}
              onSearch={(v) => setKeyword(v)}
            />,
            <Auth perm="system:user:add" key="add">
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                新增用户
              </Button>
            </Auth>,
          ]}
          headerTitle={`用户列表 - ${currentDeptTitle}`}
          options={{ reload: reloadUsers }}
        />
      </div>

      <UserEditModal
        open={modalOpen}
        editing={editing}
        deptTree={deptTree}
        prefillDept={selectedKey > 0 ? selectedKey : undefined}
        onOpenChange={setModalOpen}
        onSuccess={reloadUsers}
      />
      <HandoverModal target={handoverTarget} onClose={() => setHandoverTarget(null)} />
      <ResetPasswordModal target={resetPwdTarget} onClose={() => setResetPwdTarget(null)} />
    </div>
  )
}
