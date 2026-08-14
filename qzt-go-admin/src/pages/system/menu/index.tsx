import { useRef, useState } from 'react'
import { App, Button, Col, Form, Popconfirm, Select, Space, Tag, TreeSelect } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormDependency,
  ProFormDigit,
  ProFormRadio,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import MenuIcon, { iconOptions } from '../../../components/MenuIcon'
import { fetchUserInfo } from '../../../services/auth'
import { createMenu, deleteMenu, getMenuTree, listAllApis, updateMenu } from '../../../services/system'
import type { MenuPayload, MenuType, SysMenu } from '../../../types'

interface MenuFormValues {
  parent_id?: number
  type: MenuType
  name: string
  icon?: string
  path?: string
  component?: string
  permission?: string
  api_ids?: number[]
  sort: number
  visible: number
  status: number
}

interface MenuTreeNode {
  title: string
  value: number
  children?: MenuTreeNode[]
}

const typeMap: Record<MenuType, { color: string; text: string }> = {
  0: { color: 'blue', text: '目录' },
  1: { color: 'green', text: '菜单' },
  2: { color: 'orange', text: '按钮' },
}

const toTreeData = (menus: SysMenu[]): MenuTreeNode[] =>
  menus.map((m) => ({
    title: `${m.name}(${typeMap[m.type].text})`,
    value: m.id,
    children: m.children?.length ? toTreeData(m.children) : undefined,
  }))

export default function MenuPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<MenuFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SysMenu | null>(null)
  const [treeData, setTreeData] = useState<MenuTreeNode[]>([])
  const [apiOptions, setApiOptions] = useState<{ label: string; value: number }[]>([])

  const loadOptions = async () => {
    const [tree, apis] = await Promise.all([getMenuTree(), listAllApis()])
    setTreeData(toTreeData(tree))
    setApiOptions(apis.map((a) => ({ label: `${a.method} ${a.path} ${a.description}`, value: a.id })))
  }

  const openCreate = (parent?: SysMenu) => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      parent_id: parent?.id,
      type: parent ? ((parent.type === 0 ? 1 : 2) as MenuType) : 0,
      sort: 0,
      visible: 1,
      status: 1,
    })
    setModalOpen(true)
  }

  const openEdit = (record: SysMenu) => {
    setEditing(record)
    form.setFieldsValue({
      parent_id: record.parent_id === 0 ? undefined : record.parent_id,
      type: record.type,
      name: record.name,
      icon: record.icon || undefined,
      path: record.path || undefined,
      component: record.component || undefined,
      permission: record.permission || undefined,
      api_ids: record.apis?.map((a) => a.id) ?? [],
      sort: record.sort,
      visible: record.visible,
      status: record.status,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: MenuFormValues) => {
    const payload: MenuPayload = {
      parent_id: values.parent_id ?? 0,
      name: values.name,
      path: values.path,
      component: values.component,
      icon: values.icon,
      sort: values.sort ?? 0,
      type: values.type,
      permission: values.permission,
      visible: values.visible,
      status: values.status,
      api_ids: values.api_ids,
    }
    if (editing) {
      await updateMenu(editing.id, payload)
      message.success('菜单已更新')
    } else {
      await createMenu(payload)
      message.success('菜单已创建')
    }
    actionRef.current?.reload()
    fetchUserInfo().catch(() => {})
    return true
  }

  const handleDelete = async (record: SysMenu) => {
    await deleteMenu(record.id)
    message.success('菜单已删除')
    actionRef.current?.reload()
    fetchUserInfo().catch(() => {})
  }

  const columns: ProColumns<SysMenu>[] = [
    {
      title: '菜单名称',
      dataIndex: 'name',
      width: 200,
      render: (_, r) => (
        <Space size={4}>
          <MenuIcon icon={r.icon} />
          {r.name}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (_, r) => <Tag color={typeMap[r.type].color}>{typeMap[r.type].text}</Tag>,
    },
    { title: '路由地址', dataIndex: 'path', width: 180, render: (_, r) => r.path || '-' },
    { title: '前端组件', dataIndex: 'component', width: 180, render: (_, r) => r.component || '-' },
    { title: '权限标识', dataIndex: 'permission', width: 180, render: (_, r) => r.permission || '-' },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '可见',
      dataIndex: 'visible',
      width: 80,
      render: (_, r) => (r.visible === 1 ? <Tag color="green">显示</Tag> : <Tag>隐藏</Tag>),
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
    {
      title: '操作',
      valueType: 'option',
      width: 190,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          {record.type !== 2 && (
            <Auth perm="system:menu:add">
              <Button type="link" size="small" onClick={() => openCreate(record)}>
                新增子项
              </Button>
            </Auth>
          )}
          <Auth perm="system:menu:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="system:menu:delete">
            <Popconfirm
              title="确认删除该菜单?"
              description="删除后将级联删除其所有子菜单"
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
      <ProTable<SysMenu>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        pagination={false}
        expandable={{ defaultExpandAllRows: true }}
        request={async () => {
          const tree = await getMenuTree()
          return { data: tree, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="system:menu:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
              新增菜单
            </Button>
          </Auth>,
        ]}
        headerTitle="菜单列表"
      />
      <ModalForm<MenuFormValues>
        title={editing ? '编辑菜单' : '新增菜单'}
        form={form}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (open) loadOptions()
        }}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <Col span={24}>
          <ProForm.Item name="parent_id" label="上级菜单">
            <TreeSelect
              treeData={treeData}
              treeDefaultExpandAll
              allowClear
              placeholder="不选则为顶级菜单"
            />
          </ProForm.Item>
        </Col>
        <ProFormRadio.Group
          name="type"
          label="类型"
          initialValue={0}
          rules={[{ required: true, message: '请选择类型' }]}
          fieldProps={{ optionType: 'button' }}
          options={[
            { label: '目录', value: 0 },
            { label: '菜单', value: 1 },
            { label: '按钮', value: 2 },
          ]}
          colProps={{ span: 24 }}
        />
        <ProFormText
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入名称' }]}
          placeholder="菜单名称"
          colProps={{ span: 12 }}
        />
        <ProFormDependency name={['type']}>
          {({ type }) => (
            <>
              {type !== 2 && (
                <Col span={12}>
                  <ProForm.Item name="icon" label="图标">
                    <Select
                      showSearch
                      allowClear
                      placeholder="选择图标"
                      options={iconOptions}
                      optionRender={(option) => (
                        <Space size={4}>
                          <MenuIcon icon={String(option.value)} />
                          {option.label}
                        </Space>
                      )}
                    />
                  </ProForm.Item>
                </Col>
              )}
              {type !== 2 && (
                <ProFormText
                  name="path"
                  label="路由地址"
                  placeholder="如 /system/user"
                  colProps={{ span: 12 }}
                />
              )}
              {type === 1 && (
                <ProFormText
                  name="component"
                  label="前端组件"
                  placeholder="如 system/user/index"
                  colProps={{ span: 12 }}
                />
              )}
              {type !== 0 && (
                <ProFormText
                  name="permission"
                  label="权限标识"
                  placeholder="如 system:user:list"
                  colProps={{ span: 12 }}
                />
              )}
              {type === 1 && (
                <Col span={24}>
                  <ProForm.Item name="api_ids" label="关联 API">
                    <Select mode="multiple" allowClear placeholder="选择关联的 API" options={apiOptions} />
                  </ProForm.Item>
                </Col>
              )}
            </>
          )}
        </ProFormDependency>
        <ProFormDigit
          name="sort"
          label="排序"
          initialValue={0}
          min={0}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
        <ProFormRadio.Group
          name="visible"
          label="可见"
          initialValue={1}
          options={[
            { label: '显示', value: 1 },
            { label: '隐藏', value: 0 },
          ]}
          colProps={{ span: 12 }}
        />
        <ProFormRadio.Group
          name="status"
          label="状态"
          initialValue={1}
          options={[
            { label: '正常', value: 1 },
            { label: '停用', value: 0 },
          ]}
          colProps={{ span: 12 }}
        />
      </ModalForm>
    </>
  )
}
