import { App, Col, DatePicker, Divider, Form, Row, Select, TreeSelect } from 'antd'
import {
  ModalForm,
  ProForm,
  ProFormDependency,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components'
import dayjs, { type Dayjs } from 'dayjs'
import UserSelect from '../../../components/UserSelect'
import { createEmployee, updateEmployee } from '../../../services/hrm'
import type { HrmEmployee, HrmEmployeePayload, HrmPosition } from '../../../types/hrm'

export interface EmployeeFormValues {
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

export interface DeptTreeNode {
  title: string
  value: number
  children?: DeptTreeNode[]
}

interface EmployeeEditModalProps {
  open: boolean
  editing: HrmEmployee | null
  treeData: DeptTreeNode[]
  positions: HrmPosition[]
  deptName: (id: number | null) => string
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

/** 把 DatePicker 的值(dayjs 对象或字符串)统一转成 YYYY-MM-DD 字符串 */
const toDateStr = (v: Dayjs | string | undefined | null): string | undefined => {
  if (!v) return undefined
  if (typeof v === 'string') return v.slice(0, 10)
  return v.format('YYYY-MM-DD')
}

/** 员工新增/编辑表单(基本信息/组织信息/联系方式/日期/备注分区) */
export default function EmployeeEditModal({
  open,
  editing,
  treeData,
  positions,
  deptName,
  onOpenChange,
  onSuccess,
}: EmployeeEditModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<EmployeeFormValues>()

  const positionOptions = positions.map((p) => ({
    label: `${p.name}(${deptName(p.department_id)})`,
    value: p.id,
  }))

  const handleOpenChange = (next: boolean) => {
    if (next) {
      if (editing) {
        form.setFieldsValue({
          emp_no: editing.emp_no,
          name: editing.name,
          department_id: editing.department_id,
          position_id: editing.position_id,
          gender: editing.gender,
          phone: editing.phone || undefined,
          email: editing.email || undefined,
          entry_date: editing.entry_date ? dayjs(editing.entry_date) : undefined,
          resign_date: editing.resign_date ? dayjs(editing.resign_date) : undefined,
          user_id: editing.user_id ?? undefined,
          status: editing.status,
          remark: editing.remark || undefined,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({ status: 1, gender: 1 })
      }
    }
    onOpenChange(next)
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
      onSuccess()
      return true
    } catch (e) {
      message.error(`保存失败: ${e instanceof Error ? e.message : String(e)}`)
      return false
    }
  }

  return (
    <ModalForm<EmployeeFormValues>
      title={editing ? '编辑员工' : '新增员工'}
      form={form}
      open={open}
      onOpenChange={handleOpenChange}
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
  )
}
