import { useEffect, useRef, useState } from 'react'
import { App, Button, Col, DatePicker, Divider, Drawer, Form, Popconfirm, Row, Select, Space, Spin, Tag, Timeline, TreeSelect } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProForm,
  ProFormDependency,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import dayjs, { type Dayjs } from 'dayjs'
import Auth from '../../../components/Auth'
import ExportButtons from '../../../components/ExportButtons'
import UserSelect from '../../../components/UserSelect'
import { usePageGuide } from '../../../components/guide/usePageGuide'
import { GuideHelpButton } from '../../../components/guide/GuideHelpButton'
import {
  createEmployee,
  deleteEmployee,
  getDepartmentTree,
  getEmployeeChanges,
  listEmployees,
  listEnabledPositions,
  updateEmployee,
} from '../../../services/hrm'
import type {
  HrmDepartment,
  HrmEmployee,
  HrmEmployeeChange,
  HrmEmployeePayload,
  HrmPosition,
} from '../../../types/hrm'
import { maskPhone, maskEmail } from '../../../utils/mask'

interface EmployeeFormValues {
  emp_no: string
  name: string
  department_id: number
  position_id: number
  gender?: number
  phone?: string
  email?: string
  /** DatePicker 可能返回 dayjs 对象或字符串(编辑回填时) */
  entry_date?: Dayjs | string
  resign_date?: Dayjs | string
  user_id?: number
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

const changeTypeMap: Record<string, { color: string; text: string }> = {
  HIRE: { color: 'green', text: '入职' },
  TRANSFER: { color: 'blue', text: '调动' },
  RESIGN: { color: 'red', text: '离职' },
}

export default function EmployeePage() {
  usePageGuide('hrm.employee')
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<EmployeeFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<HrmEmployee | null>(null)
  const [treeData, setTreeData] = useState<DeptTreeNode[]>([])
  const [positions, setPositions] = useState<HrmPosition[]>([])
  const deptMapRef = useRef<Map<number, string>>(new Map())
  const positionMapRef = useRef<Map<number, string>>(new Map())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [changesLoading, setChangesLoading] = useState(false)
  const [changes, setChanges] = useState<HrmEmployeeChange[]>([])
  const [changesEmployee, setChangesEmployee] = useState<HrmEmployee | null>(null)

  useEffect(() => {
    getDepartmentTree().then((tree) => {
      setTreeData(toTreeData(tree))
      const flat = flattenDepartments(tree)
      deptMapRef.current = new Map(flat.map((d) => [d.id, d.name]))
    })
    listEnabledPositions().then((list) => {
      setPositions(list)
      positionMapRef.current = new Map(list.map((p) => [p.id, p.name]))
    })
  }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 1, gender: 1 })
    setModalOpen(true)
  }

  const openEdit = (record: HrmEmployee) => {
    setEditing(record)
    form.setFieldsValue({
      emp_no: record.emp_no,
      name: record.name,
      department_id: record.department_id,
      position_id: record.position_id,
      gender: record.gender,
      phone: record.phone || undefined,
      email: record.email || undefined,
      entry_date: record.entry_date ? dayjs(record.entry_date) : undefined,
      resign_date: record.resign_date ? dayjs(record.resign_date) : undefined,
      user_id: record.user_id ?? undefined,
      status: record.status,
      remark: record.remark || undefined,
    })
    setModalOpen(true)
  }

  /** 把 DatePicker 的值(dayjs 对象或字符串)统一转成 YYYY-MM-DD 字符串 */
  const toDateStr = (v: Dayjs | string | undefined | null): string | undefined => {
    if (!v) return undefined
    if (typeof v === 'string') return v.slice(0, 10)
    return v.format('YYYY-MM-DD')
  }

  const handleSubmit = async (values: EmployeeFormValues) => {
    try {
      const payload: HrmEmployeePayload = {
        emp_no: values.emp_no,
        name: values.name,
        department_id: values.department_id,
        position_id: values.position_id,
        gender: values.gender,
        phone: values.phone,
        email: values.email,
        entry_date: toDateStr(values.entry_date),
        resign_date: toDateStr(values.resign_date),
        user_id: values.user_id,
        status: values.status,
        remark: values.remark,
      }
      if (editing) {
        await updateEmployee(editing.id, payload)
        message.success('员工已更新')
      } else {
        await createEmployee(payload)
        message.success('员工已创建')
      }
      actionRef.current?.reload()
      return true
    } catch (e) {
      message.error(`保存失败: ${e instanceof Error ? e.message : String(e)}`)
      return false
    }
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

  const deptName = (id: number | null) => (id ? (deptMapRef.current.get(id) ?? `#${id}`) : '-')
  const positionName = (id: number | null) =>
    id ? (positionMapRef.current.get(id) ?? `#${id}`) : '-'

  const positionOptions = positions.map((p) => ({
    label: `${p.name}(${deptName(p.department_id)})`,
    value: p.id,
  }))

  const columns: ProColumns<HrmEmployee>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
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
      <ModalForm<EmployeeFormValues>
        title={editing ? '编辑员工' : '新增员工'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        onFinishFailed={(errorInfo) => {
          const msgs = errorInfo.errorFields.map((f) => f.errors.join(', ')).join('; ')
          message.warning(`表单校验未通过: ${msgs || '请检查必填项'}`)
        }}
        width={680}
      >
        <Divider orientation="left" orientationMargin={0} style={{ marginTop: 0 }}>基本信息</Divider>
        <Row gutter={24}>
          <Col span={12}>
            <ProFormText
              name="emp_no"
              label="工号"
              rules={[{ required: true, message: '请输入工号' }]}
              placeholder="如 EMP001"
            />
          </Col>
          <Col span={12}>
            <ProFormText
              name="name"
              label="姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
              placeholder="员工姓名"
            />
          </Col>
          <Col span={12}>
            <ProFormRadio.Group
              name="gender"
              label="性别"
              options={[{ label: '男', value: 1 }, { label: '女', value: 2 }]}
            />
          </Col>
          <Col span={12}>
            <ProFormRadio.Group
              name="status"
              label="状态"
              rules={[{ required: true, message: '请选择状态' }]}
              options={[{ label: '在职', value: 1 }, { label: '离职', value: 0 }]}
            />
          </Col>
        </Row>

        <Divider orientation="left" orientationMargin={0}>组织信息</Divider>
        <Row gutter={24}>
          <Col span={12}>
            <ProForm.Item
              name="department_id"
              label="部门"
              rules={[{ required: true, message: '请选择部门' }]}
            >
              <TreeSelect treeData={treeData} treeDefaultExpandAll allowClear placeholder="选择部门" />
            </ProForm.Item>
          </Col>
          <Col span={12}>
            <ProFormDependency name={['department_id']}>
              {({ department_id }) => (
                <ProForm.Item
                  name="position_id"
                  label="岗位"
                  rules={[{ required: true, message: '请选择岗位' }]}
                >
                  <Select
                    allowClear showSearch optionFilterProp="label"
                    placeholder="选择岗位"
                    options={
                      department_id
                        ? positions.filter((p) => p.department_id === department_id).map((p) => ({ label: p.name, value: p.id }))
                        : positionOptions
                    }
                  />
                </ProForm.Item>
              )}
            </ProFormDependency>
          </Col>
          <Col span={12}>
            <ProForm.Item name="user_id" label="关联用户">
              <UserSelect placeholder="选择关联的系统用户" />
            </ProForm.Item>
          </Col>
        </Row>

        <Divider orientation="left" orientationMargin={0}>联系方式</Divider>
        <Row gutter={24}>
          <Col span={12}>
            <ProFormText name="phone" label="手机" placeholder="选填" />
          </Col>
          <Col span={12}>
            <ProFormText name="email" label="邮箱" placeholder="选填" rules={[{ type: 'email', message: '邮箱格式不正确' }]} />
          </Col>
        </Row>

        <Divider orientation="left" orientationMargin={0}>日期信息</Divider>
        <Row gutter={24}>
          <Col span={12}>
            <ProForm.Item name="entry_date" label="入职日期">
              <DatePicker style={{ width: '100%' }} placeholder="选择入职日期" />
            </ProForm.Item>
          </Col>
          {editing && (
            <Col span={12}>
              <ProForm.Item name="resign_date" label="离职日期">
                <DatePicker style={{ width: '100%' }} placeholder="选择离职日期" />
              </ProForm.Item>
            </Col>
          )}
        </Row>

        <Divider orientation="left" orientationMargin={0}>备注</Divider>
        <ProFormTextArea
          name="remark"
          label="备注"
          placeholder="选填"
          fieldProps={{ rows: 2 }}
        />
      </ModalForm>
      <Drawer
        title={changesEmployee ? `${changesEmployee.name} 的变更履历` : '变更履历'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
      >
        <Spin spinning={changesLoading}>
          {changes.length ? (
            <Timeline
              items={changes.map((c) => {
                const type = changeTypeMap[c.change_type]
                return {
                  color: type?.color ?? 'gray',
                  children: (
                    <div>
                      <Space size={8}>
                        <Tag color={type?.color}>{type?.text ?? c.change_type}</Tag>
                        <span style={{ color: '#999', fontSize: 12 }}>
                          {dayjs(c.created_at).format('YYYY-MM-DD HH:mm')}
                        </span>
                      </Space>
                      {(c.from_department_id || c.to_department_id) && (
                        <div style={{ marginTop: 4 }}>
                          部门:{deptName(c.from_department_id)} → {deptName(c.to_department_id)}
                        </div>
                      )}
                      {(c.from_position_id || c.to_position_id) && (
                        <div style={{ marginTop: 4 }}>
                          岗位:{positionName(c.from_position_id)} → {positionName(c.to_position_id)}
                        </div>
                      )}
                      {c.reason && <div style={{ marginTop: 4 }}>原因:{c.reason}</div>}
                    </div>
                  ),
                }
              })}
            />
          ) : (
            !changesLoading && <div style={{ color: '#999' }}>暂无变更履历</div>
          )}
        </Spin>
      </Drawer>
    </>
  )
}
