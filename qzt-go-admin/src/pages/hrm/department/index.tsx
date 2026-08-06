import { useRef, useState } from 'react'
import { App, Button, Col, Form, Popconfirm, Space, Tag, TreeSelect } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProForm,
  ProFormDigit,
  ProFormRadio,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import UserSelect from '../../../components/UserSelect'
import {
  createDepartment,
  deleteDepartment,
  getDepartmentTree,
  updateDepartment,
} from '../../../services/hrm'
import type { HrmDepartment, HrmDepartmentPayload } from '../../../types/hrm'
import { useUserStore } from '../../../stores/users'

interface DepartmentFormValues {
  parent_id?: number
  name: string
  code: string
  leader_id?: number
  sort?: number
  status: number
}

interface DeptTreeNode {
  title: string
  value: number
  children?: DeptTreeNode[]
}

const toTreeData = (list: HrmDepartment[]): DeptTreeNode[] =>
  list.map((d) => ({
    title: d.name,
    value: d.id,
    children: d.children?.length ? toTreeData(d.children) : undefined,
  }))

export default function DepartmentPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<DepartmentFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<HrmDepartment | null>(null)
  const [treeData, setTreeData] = useState<DeptTreeNode[]>([])
  const nickname = useUserStore((s) => s.nickname)

  const openCreate = (parent?: HrmDepartment) => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ parent_id: parent?.id, sort: 0, status: 1 })
    setModalOpen(true)
  }

  const openEdit = (record: HrmDepartment) => {
    setEditing(record)
    form.setFieldsValue({
      parent_id: record.parent_id === 0 ? undefined : record.parent_id,
      name: record.name,
      code: record.code,
      leader_id: record.leader_id ?? undefined,
      sort: record.sort,
      status: record.status,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: DepartmentFormValues) => {
    const payload: HrmDepartmentPayload = {
      parent_id: values.parent_id ?? 0,
      name: values.name,
      code: values.code,
      leader_id: values.leader_id,
      sort: values.sort ?? 0,
      status: values.status,
    }
    if (editing) {
      await updateDepartment(editing.id, payload)
      message.success('部门已更新')
    } else {
      await createDepartment(payload)
      message.success('部门已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: HrmDepartment) => {
    await deleteDepartment(record.id)
    message.success('部门已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<HrmDepartment>[] = [
    { title: '名称', dataIndex: 'name', width: 220 },
    { title: '编码', dataIndex: 'code', width: 140 },
    {
      title: '负责人',
      dataIndex: 'leader_id',
      width: 120,
      render: (_, r) => (r.leader_id ? nickname(r.leader_id) : '-'),
    },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (_, r) => (r.status === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 190,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Auth perm="hrm:department:add">
            <Button type="link" size="small" onClick={() => openCreate(record)}>
              新增子部门
            </Button>
          </Auth>
          <Auth perm="hrm:department:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="hrm:department:delete">
            <Popconfirm
              title="确认删除该部门?"
              description="删除前请确保其下无子部门与员工"
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
      <ProTable<HrmDepartment>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        pagination={false}
        expandable={{ defaultExpandAllRows: true }}
        request={async () => {
          const tree = await getDepartmentTree()
          setTreeData(toTreeData(tree))
          return { data: tree, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="hrm:department:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
              新增部门
            </Button>
          </Auth>,
        ]}
        headerTitle="部门列表"
      />
      <ModalForm<DepartmentFormValues>
        title={editing ? '编辑部门' : '新增部门'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <Col span={24}>
          <ProForm.Item name="parent_id" label="上级部门">
            <TreeSelect
              treeData={treeData}
              treeDefaultExpandAll
              allowClear
              placeholder="不选则为顶级部门"
            />
          </ProForm.Item>
        </Col>
        <ProFormText
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入部门名称' }]}
          placeholder="如 技术部"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="code"
          label="编码"
          rules={[{ required: true, message: '请输入部门编码' }]}
          placeholder="如 TECH"
          colProps={{ span: 12 }}
        />
        <Col span={12}>
          <ProForm.Item name="leader_id" label="负责人">
            <UserSelect placeholder="选择负责人" />
          </ProForm.Item>
        </Col>
        <ProFormDigit
          name="sort"
          label="排序"
          min={0}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
        <ProFormRadio.Group
          name="status"
          label="状态"
          rules={[{ required: true, message: '请选择状态' }]}
          options={[
            { label: '启用', value: 1 },
            { label: '停用', value: 0 },
          ]}
          colProps={{ span: 12 }}
        />
      </ModalForm>
    </>
  )
}
