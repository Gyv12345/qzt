import { useEffect, useRef, useState } from 'react'
import { App, Button, Form, Popconfirm, Select, Space, Switch, Tag, TreeSelect, type TreeSelectProps } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { createUser, deleteUser, listUsers, updateUser } from '../../../services/system'
import { listAllRoles } from '../../../services/system'
import { getDepartmentTree } from '../../../services/hrm'
import type { HrmDepartment } from '../../../types/hrm'
import type { SysUser } from '../../../types'

/** 部门树 → TreeSelect data */
function deptToTreeData(depts: HrmDepartment[]): TreeSelectProps['treeData'] {
  return depts.map((d) => ({
    title: d.name,
    value: d.id,
    children: d.children?.length ? deptToTreeData(d.children) : undefined,
  }))
}

interface UserFormValues {
  username: string
  nickname: string
  dept_id?: number | null
  password?: string
  email?: string
  phone?: string
  status: boolean
  role_ids?: number[]
}

export default function UserPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<UserFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SysUser | null>(null)
  const [roleOptions, setRoleOptions] = useState<{ label: string; value: number }[]>([])
  const [deptTree, setDeptTree] = useState<HrmDepartment[]>([])

  useEffect(() => {
    getDepartmentTree().then(setDeptTree).catch(() => {})
  }, [])

  const loadRoles = async () => {
    const roles = await listAllRoles()
    setRoleOptions(roles.map((r) => ({ label: r.name, value: r.id })))
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: true } as Partial<UserFormValues>)
    setModalOpen(true)
  }

  const openEdit = (record: SysUser) => {
    setEditing(record)
    form.setFieldsValue({
      username: record.username,
      nickname: record.nickname,
      dept_id: record.dept_id ?? undefined,
      password: undefined,
      email: record.email,
      phone: record.phone,
      status: record.status === 1,
      role_ids: record.roles?.map((r) => r.id) ?? [],
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: UserFormValues) => {
    const payload = {
      nickname: values.nickname,
      dept_id: values.dept_id ?? null,
      email: values.email,
      phone: values.phone,
      status: values.status ? 1 : 0,
      role_ids: values.role_ids,
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
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: SysUser) => {
    await deleteUser(record.id)
    message.success('用户已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<SysUser>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70 },
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '昵称', dataIndex: 'nickname', width: 120 },
    { title: '邮箱', dataIndex: 'email', width: 180, render: (_, r) => r.email || '-' },
    { title: '手机号', dataIndex: 'phone', width: 130, render: (_, r) => r.phone || '-' },
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
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="system:user:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
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
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<SysUser>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        request={async ({ current, pageSize }) => {
          const res = await listUsers({ page: current, page_size: pageSize })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="system:user:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增用户
            </Button>
          </Auth>,
        ]}
        headerTitle="用户列表"
      />
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
        <ProForm.Item name="dept_id" label="部门" colProps={{ span: 12 }}>
          <TreeSelect
            allowClear
            placeholder="选择部门"
            treeData={deptToTreeData(deptTree)}
            treeDefaultExpandAll
          />
        </ProForm.Item>
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
        <ProForm.Item name="role_ids" label="角色" colProps={{ span: 12 }}>
          <Select mode="multiple" allowClear placeholder="选择角色" options={roleOptions} />
        </ProForm.Item>
        <ProForm.Item name="status" label="状态" valuePropName="checked" colProps={{ span: 12 }}>
          <Switch checkedChildren="正常" unCheckedChildren="停用" />
        </ProForm.Item>
      </ModalForm>
    </>
  )
}
