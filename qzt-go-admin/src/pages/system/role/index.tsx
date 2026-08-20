import { useRef, useState, type Key } from 'react'
import { App, Button, Col, Form, Modal, Popconfirm, Radio, Space, Spin, Switch, Tree, type TreeProps } from 'antd'
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
import { pageIndexColumn } from '../../../components/IndexTag'

interface RoleFormValues {
  name: string
  code: string
  sort: number
  status: boolean
  data_scope: number
  remark?: string
}

/** 数据权限选项 */
const DATA_SCOPE_OPTIONS = [
  { label: '全部数据', value: 1 },
  { label: '本部门数据', value: 3 },
  { label: '本部门及子部门', value: 4 },
  { label: '仅本人数据', value: 5 },
]

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

/** 构建 菜单id → 父菜单id 映射,用于提交时补全祖先链 */
const buildParentMap = (menus: SysMenu[], parent?: number): Map<number, number> => {
  const map = new Map<number, number>()
  for (const m of menus) {
    if (parent !== undefined) map.set(m.id, parent)
    if (m.children?.length) {
      for (const [k, v] of buildParentMap(m.children, m.id)) map.set(k, v)
    }
  }
  return map
}

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
  /** 菜单 id → 父菜单 id,提交时据此补全祖先链 */
  const parentMapRef = useRef<Map<number, number>>(new Map())
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuSaving, setMenuSaving] = useState(false)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sort: 0, status: true, data_scope: 1 } as Partial<RoleFormValues>)
    setModalOpen(true)
  }

  const openEdit = (record: SysRole) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      sort: record.sort,
      status: record.status === 1,
      data_scope: record.data_scope ?? 1,
      remark: record.remark,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: RoleFormValues) => {
    const payload = {
      name: values.name,
      sort: values.sort,
      status: values.status ? 1 : 0,
      data_scope: values.data_scope,
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
    try {
      const [menus, role] = await Promise.all([getMenuTree(), getRole(record.id)])
      setTreeData(toTreeData(menus))
      parentMapRef.current = buildParentMap(menus)
      // 仅勾选叶子节点,避免 antd 父子联动导致父节点带出全选;
      // 祖先链(目录/页面)在提交时由 handleMenuSubmit 补全
      const leafIds = new Set(collectLeafIds(menus))
      const assigned = (role.menus ?? []).map((m) => m.id).filter((id) => leafIds.has(id))
      setCheckedKeys(assigned)
    } finally {
      setMenuLoading(false)
    }
  }

  const handleTreeCheck: TreeProps['onCheck'] = (checked) => {
    setCheckedKeys(Array.isArray(checked) ? checked : checked.checked)
  }

  const handleMenuSubmit = async () => {
    if (!menuRole) return
    setMenuSaving(true)
    try {
      // 提交集合 = 勾选节点 + 其全部祖先(目录/页面)。只授叶子不授祖先会导致
      // 菜单树断链,角色侧栏看不到该菜单且路由不注册(页面 404)
      const ids = new Set<number>(checkedKeys.map(Number))
      for (const key of checkedKeys) {
        let cur = Number(key)
        while (parentMapRef.current.has(cur)) {
          const parent = parentMapRef.current.get(cur)!
          ids.add(parent)
          cur = parent
        }
      }
      await setRoleMenus(menuRole.id, [...ids])
      message.success('菜单授权已保存')
      setMenuModalOpen(false)
    } finally {
      setMenuSaving(false)
    }
  }

  const columns: ProColumns<SysRole>[] = [
    pageIndexColumn(actionRef),
    { title: '名称', dataIndex: 'name', width: 140 },
    { title: '编码', dataIndex: 'code', width: 140 },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '数据权限',
      dataIndex: 'data_scope',
      width: 130,
      valueEnum: {
        1: { text: '全部' },
        3: { text: '本部门' },
        4: { text: '本部门及子部门' },
        5: { text: '仅本人' },
      },
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
        <Col span={12}>
          <ProForm.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="正常" unCheckedChildren="停用" />
          </ProForm.Item>
        </Col>
        <Col span={24}>
          <ProForm.Item name="data_scope" label="数据权限" rules={[{ required: true, message: '请选择数据权限' }]}>
            <Radio.Group options={DATA_SCOPE_OPTIONS} optionType="button" buttonStyle="solid" />
          </ProForm.Item>
        </Col>
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
