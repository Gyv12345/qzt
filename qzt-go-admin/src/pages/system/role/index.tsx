import { useRef, useState, type Key } from 'react'
import { App, Button, Form, Modal, Popconfirm, Space, Spin, Switch, Tree, type TreeProps } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import {
  ProForm,
  ModalForm,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  createRole,
  deleteRole,
  getMenuTree,
  getRole,
  listRoles,
  setRoleMenus,
  updateRole,
} from '../../../services/system'
import type { SysMenu, SysRole } from '../../../types'

interface RoleFormValues {
  name: string
  code: string
  sort: number
  status: boolean
  remark?: string
}

/** SysMenu 树递归映射为 Tree 的 DataNode */
const toTreeData = (menus: SysMenu[]): DataNode[] =>
  menus.map((m) => ({
    title: m.name,
    key: m.id,
    children: m.children?.length ? toTreeData(m.children) : undefined,
  }))

/** 收集树中所有叶子节点(无 children)的 id */
const collectLeafIds = (menus: SysMenu[]): number[] =>
  menus.flatMap((m) => (m.children?.length ? collectLeafIds(m.children) : [m.id]))

export default function RolePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<RoleFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SysRole | null>(null)

  // 菜单授权
  const [menuModalOpen, setMenuModalOpen] = useState(false)
  const [menuRole, setMenuRole] = useState<SysRole | null>(null)
  const [treeData, setTreeData] = useState<DataNode[]>([])
  const [checkedKeys, setCheckedKeys] = useState<Key[]>([])
  const [halfCheckedKeys, setHalfCheckedKeys] = useState<Key[]>([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuSaving, setMenuSaving] = useState(false)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sort: 0, status: true } as Partial<RoleFormValues>)
    setModalOpen(true)
  }

  const openEdit = (record: SysRole) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      sort: record.sort,
      status: record.status === 1,
      remark: record.remark,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: RoleFormValues) => {
    const payload = {
      name: values.name,
      sort: values.sort,
      status: values.status ? 1 : 0,
      remark: values.remark,
    }
    if (editing) {
      await updateRole(editing.id, payload)
      message.success('角色已更新')
    } else {
      await createRole({ ...payload, code: values.code })
      message.success('角色已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: SysRole) => {
    await deleteRole(record.id)
    message.success('角色已删除')
    actionRef.current?.reload()
  }

  const openMenuModal = async (record: SysRole) => {
    setMenuRole(record)
    setMenuModalOpen(true)
    setMenuLoading(true)
    setCheckedKeys([])
    setHalfCheckedKeys([])
    try {
      const [menus, role] = await Promise.all([getMenuTree(), getRole(record.id)])
      setTreeData(toTreeData(menus))
      // 仅勾选叶子节点,避免 antd 父子联动导致父节点带出全选
      const leafIds = new Set(collectLeafIds(menus))
      const assigned = (role.menus ?? []).map((m) => m.id).filter((id) => leafIds.has(id))
      setCheckedKeys(assigned)
    } finally {
      setMenuLoading(false)
    }
  }

  const handleTreeCheck: TreeProps['onCheck'] = (checked, info) => {
    setCheckedKeys(Array.isArray(checked) ? checked : checked.checked)
    setHalfCheckedKeys(info.halfCheckedKeys ?? [])
  }

  const handleMenuSubmit = async () => {
    if (!menuRole) return
    setMenuSaving(true)
    try {
      const ids = [...checkedKeys, ...halfCheckedKeys].map(Number)
      await setRoleMenus(menuRole.id, ids)
      message.success('菜单授权已保存')
      setMenuModalOpen(false)
    } finally {
      setMenuSaving(false)
    }
  }

  const columns: ProColumns<SysRole>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70 },
    { title: '名称', dataIndex: 'name', width: 140 },
    { title: '编码', dataIndex: 'code', width: 140 },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      valueEnum: {
        1: { text: '正常', status: 'Success' },
        0: { text: '停用', status: 'Default' },
      },
    },
    { title: '备注', dataIndex: 'remark', width: 200, ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="system:role:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          {record.code !== 'super_admin' && (
            <Auth perm="system:role:edit">
              <Button type="link" size="small" onClick={() => openMenuModal(record)}>
                菜单授权
              </Button>
            </Auth>
          )}
          {record.code !== 'super_admin' && (
            <Auth perm="system:role:delete">
              <Popconfirm
                title="确认删除该角色?"
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
      <ProTable<SysRole>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        request={async ({ current, pageSize }) => {
          const res = await listRoles({ page: current, page_size: pageSize })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="system:role:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增角色
            </Button>
          </Auth>,
        ]}
        headerTitle="角色列表"
      />
      <ModalForm<RoleFormValues>
        title={editing ? '编辑角色' : '新增角色'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <ProFormText
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入角色名称' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="code"
          label="编码"
          disabled={!!editing}
          rules={[{ required: true, message: '请输入角色编码' }]}
          placeholder="如 system_admin"
          colProps={{ span: 12 }}
        />
        <ProFormDigit
          name="sort"
          label="排序"
          min={0}
          fieldProps={{ precision: 0 }}
          initialValue={0}
          colProps={{ span: 12 }}
        />
        <ProForm.Item name="status" label="状态" valuePropName="checked" colProps={{ span: 12 }}>
          <Switch checkedChildren="正常" unCheckedChildren="停用" />
        </ProForm.Item>
        <ProFormTextArea name="remark" label="备注" colProps={{ span: 24 }} />
      </ModalForm>
      <Modal
        title={menuRole ? `菜单授权 - ${menuRole.name}` : '菜单授权'}
        open={menuModalOpen}
        onCancel={() => setMenuModalOpen(false)}
        onOk={handleMenuSubmit}
        confirmLoading={menuSaving}
        okText="确定"
        cancelText="取消"
        maskClosable={false}
        destroyOnHidden
        width={480}
      >
        <Spin spinning={menuLoading}>
          <Tree
            checkable
            defaultExpandAll
            treeData={treeData}
            checkedKeys={checkedKeys}
            onCheck={handleTreeCheck}
          />
        </Spin>
      </Modal>
    </>
  )
}
