import { useEffect, useMemo, useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag, TreeSelect } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import ExportButtons from '../../../components/ExportButtons'
import { usePageGuide } from '../../../components/guide/usePageGuide'
import { GuideHelpButton } from '../../../components/guide/GuideHelpButton'
import {
  deleteEmployee,
  getDepartmentTree,
  getEmployeeChanges,
  listEmployees,
  listEnabledPositions,
} from '../../../services/hrm'
import type {
  HrmDepartment,
  HrmEmployee,
  HrmEmployeeChange,
  HrmPosition,
} from '../../../types/hrm'
import { maskPhone, maskEmail } from '../../../utils/mask'
import EmployeeEditModal, { type DeptTreeNode } from './EmployeeEditModal'
import ChangesDrawer from './ChangesDrawer'
import { pageIndexColumn } from '../../../components/IndexTag'

const toTreeData = (list: HrmDepartment[]): DeptTreeNode[] =>
  list.map((d) => ({
    title: d.name,
    value: d.id,
    children: d.children?.length ? toTreeData(d.children) : undefined,
  }))

const flattenDepartments = (list: HrmDepartment[]): HrmDepartment[] =>
  list.flatMap((d) => [d, ...(d.children?.length ? flattenDepartments(d.children) : [])])

/** 员工管理:列表 + 增删改 + 变更履历 */
export default function EmployeePage() {
  usePageGuide('hrm.employee')
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<HrmEmployee | null>(null)
  const [treeData, setTreeData] = useState<DeptTreeNode[]>([])
  const [positions, setPositions] = useState<HrmPosition[]>([])
  // 部门/岗位的 id→name 映射:state + useMemo 派生,数据变化时正确触发重渲染
  const [deptMap, setDeptMap] = useState<Map<number, string>>(new Map())
  const positionMap = useMemo(
    () => new Map(positions.map((p) => [p.id, p.name] as const)),
    [positions],
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [changesLoading, setChangesLoading] = useState(false)
  const [changes, setChanges] = useState<HrmEmployeeChange[]>([])
  const [changesEmployee, setChangesEmployee] = useState<HrmEmployee | null>(null)

  useEffect(() => {
    getDepartmentTree().then((tree) => {
      setTreeData(toTreeData(tree))
      const flat = flattenDepartments(tree)
      setDeptMap(new Map(flat.map((d) => [d.id, d.name] as const)))
    })
    listEnabledPositions().then((list) => {
      setPositions(list)
    })
  }, [])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (record: HrmEmployee) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleDelete = async (record: HrmEmployee) => {
    await deleteEmployee(record.id)
    message.success('员工已删除')
    actionRef.current?.reload()
  }

  const openChanges = async (record: HrmEmployee) => {
    setChangesEmployee(record)
    setDrawerOpen(true)
    setChangesLoading(true)
    try {
      const res = await getEmployeeChanges(record.id)
      setChanges(res.list ?? [])
    } finally {
      setChangesLoading(false)
    }
  }

  const deptName = (id: number | null) => (id ? (deptMap.get(id) ?? `#${id}`) : '-')
  const positionName = (id: number | null) =>
    id ? (positionMap.get(id) ?? `#${id}`) : '-'

  const columns: ProColumns<HrmEmployee>[] = [
    pageIndexColumn(actionRef),
    { title: '工号', dataIndex: 'emp_no', width: 110, search: false },
    { title: '姓名', dataIndex: 'name', width: 110, search: false },
    {
      title: '性别',
      dataIndex: 'gender',
      width: 70,
      search: false,
      render: (_, r) => (r.gender === 1 ? '男' : r.gender === 2 ? '女' : '-'),
    },
    {
      title: '部门',
      dataIndex: 'department_id',
      width: 130,
      search: false,
      render: (_, r) => deptName(r.department_id),
    },
    {
      title: '岗位',
      dataIndex: 'position_id',
      width: 130,
      search: false,
      render: (_, r) => positionName(r.position_id),
    },
    { title: '手机', dataIndex: 'phone', width: 130, search: false, render: (_, r) => maskPhone(r.phone) || '-' },
    { title: '邮箱', dataIndex: 'email', width: 180, search: false, render: (_, r) => maskEmail(r.email) || '-' },
    { title: '入职日期', dataIndex: 'entry_date', valueType: 'date', width: 110, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      search: false,
      render: (_, r) => (r.status === 1 ? <Tag color="green">在职</Tag> : <Tag>离职</Tag>),
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true },
    {
      title: '部门',
      dataIndex: 'department_id',
      hideInTable: true,
      renderFormItem: () => (
        <TreeSelect
          allowClear
          showSearch
          treeNodeFilterProp="title"
          treeData={treeData}
          treeDefaultExpandAll
          placeholder="请选择"
        />
      ),
    },
    {
      title: '岗位',
      dataIndex: 'position_id',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        options: positions.map((p) => ({ label: p.name, value: p.id })),
        showSearch: true,
        optionFilterProp: 'label',
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      valueEnum: {
        1: { text: '在职' },
        0: { text: '离职' },
      },
    },
    {
      title: <span data-guide="action-column">操作</span>,
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openChanges(record)}>
            履历
          </Button>
          <Auth perm="hrm:employee:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="hrm:employee:delete">
            <Popconfirm
              title="确认删除该员工?"
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
      <ProTable<HrmEmployee>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listEmployees({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="hrm:employee:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} data-guide="add">
              新增员工
            </Button>
          </Auth>,
          <ExportButtons
            key="export"
            fileName="员工列表"
            columns={columns}
            fetchAll={async () => {
              const res = await listEmployees({ page: 1, page_size: 1000 })
              return res.list
            }}
          />,
          <GuideHelpButton key="guide-help" />,
        ]}
        headerTitle="员工列表"
      />
      <EmployeeEditModal
        open={modalOpen}
        editing={editing}
        treeData={treeData}
        positions={positions}
        deptName={deptName}
        onOpenChange={setModalOpen}
        onSuccess={() => actionRef.current?.reload()}
      />
      <ChangesDrawer
        open={drawerOpen}
        employee={changesEmployee}
        changes={changes}
        loading={changesLoading}
        deptName={deptName}
        positionName={positionName}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
