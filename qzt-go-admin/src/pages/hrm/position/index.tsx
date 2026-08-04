import { useEffect, useRef, useState } from 'react'
import { App, Button, Form, Popconfirm, Space, TreeSelect } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProForm,
  ProFormDigit,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  createPosition,
  deletePosition,
  getDepartmentTree,
  listPositions,
  updatePosition,
} from '../../../services/hrm'
import type { HrmDepartment, HrmPosition, HrmPositionPayload } from '../../../types/hrm'

interface PositionFormValues {
  department_id: number
  name: string
  code: string
  sort?: number
  status: number
  remark?: string
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

const flattenDepartments = (list: HrmDepartment[]): HrmDepartment[] =>
  list.flatMap((d) => [d, ...(d.children?.length ? flattenDepartments(d.children) : [])])

export default function PositionPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<PositionFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<HrmPosition | null>(null)
  const [treeData, setTreeData] = useState<DeptTreeNode[]>([])
  const [deptOptions, setDeptOptions] = useState<{ label: string; value: number }[]>([])
  const deptMapRef = useRef<Map<number, string>>(new Map())

  useEffect(() => {
    getDepartmentTree().then((tree) => {
      setTreeData(toTreeData(tree))
      const flat = flattenDepartments(tree)
      deptMapRef.current = new Map(flat.map((d) => [d.id, d.name]))
      setDeptOptions(flat.map((d) => ({ label: d.name, value: d.id })))
    })
  }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sort: 0, status: 1 })
    setModalOpen(true)
  }

  const openEdit = (record: HrmPosition) => {
    setEditing(record)
    form.setFieldsValue({
      department_id: record.department_id,
      name: record.name,
      code: record.code,
      sort: record.sort,
      status: record.status,
      remark: record.remark || undefined,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: PositionFormValues) => {
    const payload: HrmPositionPayload = {
      department_id: values.department_id,
      name: values.name,
      code: values.code,
      sort: values.sort ?? 0,
      status: values.status,
      remark: values.remark,
    }
    if (editing) {
      await updatePosition(editing.id, payload)
      message.success('岗位已更新')
    } else {
      await createPosition(payload)
      message.success('岗位已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: HrmPosition) => {
    await deletePosition(record.id)
    message.success('岗位已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<HrmPosition>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '名称', dataIndex: 'name', width: 160, search: false },
    { title: '编码', dataIndex: 'code', width: 140, search: false },
    {
      title: '所属部门',
      dataIndex: 'department_id',
      width: 140,
      search: false,
      render: (_, r) => deptMapRef.current.get(r.department_id) ?? `#${r.department_id}`,
    },
    { title: '排序', dataIndex: 'sort', width: 70, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      search: false,
      valueEnum: {
        1: { text: '启用', status: 'Success' },
        0: { text: '停用', status: 'Default' },
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 200,
      search: false,
      render: (_, r) => r.remark || '-',
    },
    {
      title: '部门',
      dataIndex: 'department_id',
      hideInTable: true,
      valueType: 'select',
      fieldProps: { options: deptOptions, showSearch: true, optionFilterProp: 'label' },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Auth perm="hrm:position:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="hrm:position:delete">
            <Popconfirm
              title="确认删除该岗位?"
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
      <ProTable<HrmPosition>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const res = await listPositions({
            department_id: params.department_id as number | undefined,
          })
          return { data: res, total: res.length, success: true }
        }}
        pagination={false}
        toolBarRender={() => [
          <Auth perm="hrm:position:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增岗位
            </Button>
          </Auth>,
        ]}
        headerTitle="岗位列表"
      />
      <ModalForm<PositionFormValues>
        title={editing ? '编辑岗位' : '新增岗位'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <ProForm.Item
          name="department_id"
          label="所属部门"
          rules={[{ required: true, message: '请选择所属部门' }]}
          colProps={{ span: 12 }}
        >
          <TreeSelect
            treeData={treeData}
            treeDefaultExpandAll
            allowClear
            placeholder="选择所属部门"
          />
        </ProForm.Item>
        <ProFormText
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入岗位名称' }]}
          placeholder="如 前端工程师"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="code"
          label="编码"
          rules={[{ required: true, message: '请输入岗位编码' }]}
          placeholder="如 FE"
          colProps={{ span: 12 }}
        />
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
        <ProFormTextArea
          name="remark"
          label="备注"
          placeholder="选填"
          fieldProps={{ rows: 2 }}
          colProps={{ span: 24 }}
        />
      </ModalForm>
    </>
  )
}
