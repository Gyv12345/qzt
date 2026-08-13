import { useEffect, useMemo, useState } from 'react'
import {
  App,
  Alert,
  Button,
  Col,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tree,
  TreeSelect,
  type TreeSelectProps,
} from 'antd'
import { PlusOutlined, SwapOutlined } from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import UserSelect from '../../../components/UserSelect'
import request from '../../../utils/request'
import {
  ProForm,
  ModalForm,
  ProFormText,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { createUser, deleteUser, listAllUsers, updateUser } from '../../../services/system'
import { listAllRoles } from '../../../services/system'
import { getDepartmentTree } from '../../../services/hrm'
import type { HrmDepartment } from '../../../types/hrm'
import type { SysUser } from '../../../types'
import { maskPhone, maskEmail } from '../../../utils/mask'
import './index.css'

/** 全部部门根节点的 key(用一个负数避免与真实部门 id 冲突) */
const ALL_DEPT_KEY = -1
/** 「未分配部门」虚拟节点 key */
const NONE_DEPT_KEY = -2

/** 部门树 → TreeSelect data(表单用) */
function deptToTreeData(depts: HrmDepartment[]): TreeSelectProps['treeData'] {
  return depts.map((d) => ({
    title: d.name,
    value: d.id,
    children: d.children?.length ? deptToTreeData(d.children) : undefined,
  }))
}

/** 部门树 → antd Tree DataNode(左侧面板用),含「全部」「未分配」虚拟节点 */
function deptToTreeNodes(depts: HrmDepartment[]): DataNode[] {
  const build = (list: HrmDepartment[]): DataNode[] =>
    list.map((d) => ({
      title: d.name,
      key: d.id,
      children: d.children?.length ? build(d.children) : undefined,
    }))
  return [
    { title: '全部部门', key: ALL_DEPT_KEY, children: build(depts) },
    { title: '未分配部门', key: NONE_DEPT_KEY },
  ]
}

/** 递归收集部门及其所有子部门 id(含自身) */
function collectDeptAndSub(depts: HrmDepartment[], id: number): Set<number> {
  const result = new Set<number>()
  const walk = (list: HrmDepartment[]) => {
    for (const d of list) {
      if (d.id === id) {
        result.add(d.id)
        collectInto(d.children, result)
        return
      }
      if (d.children?.length) walk(d.children)
    }
  }
  const collectInto = (list: HrmDepartment[] | undefined, into: Set<number>) => {
    if (!list) return
    for (const d of list) {
      into.add(d.id)
      collectInto(d.children, into)
    }
  }
  walk(depts)
  return result
}

interface UserFormValues {
  username: string
  nickname: string
  dept_id?: number | null
  leader_id?: number | null
  password?: string
  email?: string
  phone?: string
  status: boolean
  role_ids?: number[]
}

export default function UserPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<UserFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SysUser | null>(null)
  const [roleOptions, setRoleOptions] = useState<{ label: string; value: number }[]>([])
  const [deptTree, setDeptTree] = useState<HrmDepartment[]>([])
  const [treeNodes, setTreeNodes] = useState<DataNode[]>([])
  const [treeLoading, setTreeLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState<number>(ALL_DEPT_KEY)

  // 全量用户缓存(供左侧部门树前端过滤用)
  const [allUsers, setAllUsers] = useState<SysUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  // 离职交接
  const [handoverTarget, setHandoverTarget] = useState<SysUser | null>(null)
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

  const loadRoles = async () => {
    const roles = await listAllRoles()
    setRoleOptions(roles.map((r) => ({ label: r.name, value: r.id })))
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    // 若选中了具体部门,新增时预填该部门
    const prefillDept = selectedKey > 0 ? selectedKey : undefined
    form.setFieldsValue({ status: true, dept_id: prefillDept } as Partial<UserFormValues>)
    setModalOpen(true)
  }

  const openEdit = (record: SysUser) => {
    setEditing(record)
    form.setFieldsValue({
      username: record.username,
      nickname: record.nickname,
      dept_id: record.dept_id ?? undefined,
      leader_id: (record as any).leader_id ?? undefined,
      password: undefined,
      email: record.email,
      phone: record.phone,
      status: record.status === 1,
      role_ids: record.roles?.map((r) => r.id) ?? [],
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: UserFormValues) => {
    // admin(id=1) 必须始终保留超级管理员角色(id=1):后端硬拦,前端兜底补回,
    // 避免取消勾选后提交直接报错。
    const roleIds =
      editing?.id === 1
        ? Array.from(new Set([1, ...(values.role_ids ?? [])]))
        : values.role_ids
    const payload = {
      nickname: values.nickname,
      dept_id: values.dept_id ?? null,
      leader_id: values.leader_id ?? null,
      email: values.email,
      phone: values.phone,
      status: values.status ? 1 : 0,
      role_ids: roleIds,
    }
    if (editing) {
      await updateUser(editing.id, {
        ...payload,
        password: values.password || undefined,
      })
      message.success('用户已更新')
    } else {
      await createUser({
        ...payload,
        username: values.username,
        password: values.password!,
      })
      message.success('用户已创建')
    }
    reloadUsers()
    return true
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
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="system:user:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
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

      <ModalForm<UserFormValues>
        title={editing ? '编辑用户' : '新增用户'}
        form={form}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (open) loadRoles()
        }}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        {editing?.id === 1 && (
          <Col span={24}>
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="超级管理员角色受系统保护,不可移除(仅昵称/邮箱/手机等资料可自由修改)"
            />
          </Col>
        )}
        <ProFormText
          name="username"
          label="用户名"
          disabled={!!editing}
          rules={[{ required: true, message: '请输入用户名' }]}
          placeholder="登录账号"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="nickname"
          label="昵称"
          rules={[{ required: true, message: '请输入昵称' }]}
          colProps={{ span: 12 }}
        />
        <Col span={12}>
          <ProForm.Item name="dept_id" label="部门">
            <TreeSelect
              allowClear
              placeholder="选择部门"
              treeData={deptToTreeData(deptTree)}
              treeDefaultExpandAll
            />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="leader_id" label="直属上级">
            <UserSelect allowClear placeholder="选择直属上级(审批用)" />
          </ProForm.Item>
        </Col>
        <ProFormText.Password
          name="password"
          label="密码"
          rules={
            editing
              ? [{ min: 6, message: '密码至少 6 位' }]
              : [
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少 6 位' },
                ]
          }
          placeholder={editing ? '留空则不修改密码' : '至少 6 位'}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="email"
          label="邮箱"
          rules={[{ type: 'email', message: '邮箱格式不正确' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText name="phone" label="手机号" colProps={{ span: 12 }} />
        <Col span={12}>
          <ProForm.Item name="role_ids" label="角色">
            <Select mode="multiple" allowClear placeholder="选择角色" options={roleOptions} />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="正常" unCheckedChildren="停用" />
          </ProForm.Item>
        </Col>
      </ModalForm>

      {/* 离职交接 */}
      <ModalForm<{ to_user_id: number }>
        title={handoverTarget ? `离职交接 - ${handoverTarget.nickname || handoverTarget.username}` : '离职交接'}
        open={!!handoverTarget}
        onOpenChange={(open) => { if (!open) setHandoverTarget(null) }}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={async (values) => {
          if (!handoverTarget) return false
          const res = await request.post<unknown, any>('/crm/handover', {
            from_user_id: handoverTarget.id,
            to_user_id: values.to_user_id,
          })
          const r = res || {}
          message.success(
            `交接完成: 客户${r.customer || 0} 线索${r.lead || 0} 商机${r.opportunity || 0} 合同${r.contract || 0} 跟进${r.follow_record || 0}`,
          )
          setHandoverTarget(null)
          return true
        }}
        width={480}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`将 ${handoverTarget?.nickname || handoverTarget?.username} 名下的客户、线索、商机、合同、跟进记录全部转移给接收人`}
        />
        <ProForm.Item
          name="to_user_id"
          label="接收人"
          rules={[{ required: true, message: '请选择接收人' }]}
        >
          <UserSelect placeholder="选择接收人" />
        </ProForm.Item>
      </ModalForm>
    </div>
  )
}
