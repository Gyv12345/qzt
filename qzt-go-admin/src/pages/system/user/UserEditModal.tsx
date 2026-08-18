import { useState } from 'react'
import { App, Alert, Col, Form, Select, Switch, TreeSelect } from 'antd'
import { ModalForm, ProForm, ProFormText } from '@ant-design/pro-components'
import UserSelect from '../../../components/UserSelect'
import { createUser, listAllRoles, updateUser } from '../../../services/system'
import type { HrmDepartment } from '../../../types/hrm'
import type { SysUser } from '../../../types'
import { deptToTreeData } from './deptTree'

export interface UserFormValues {
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

interface UserEditModalProps {
  open: boolean
  editing: SysUser | null
  deptTree: HrmDepartment[]
  /** 新增时预填的部门 id(左侧树选中具体部门时) */
  prefillDept?: number
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

/** 用户新增/编辑表单(部门/直属上级/角色/状态);根账户(id=1)的密码/角色/状态锁定,仅资料可改 */
export default function UserEditModal({ open, editing, deptTree, prefillDept, onOpenChange, onSuccess }: UserEditModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<UserFormValues>()
  const [roleOptions, setRoleOptions] = useState<{ label: string; value: number }[]>([])
  // admin(id=1) 是系统根账户:密码/角色/状态后端硬保护拒绝变更,前端直接锁定表单项
  const isRoot = editing?.id === 1

  const handleOpenChange = (next: boolean) => {
    if (next) {
      listAllRoles()
        .then((roles) => setRoleOptions(roles.map((r) => ({ label: r.name, value: r.id }))))
        .catch(() => {})
      if (editing) {
        form.setFieldsValue({
          username: editing.username,
          nickname: editing.nickname,
          dept_id: editing.dept_id ?? undefined,
          leader_id: (editing as any).leader_id ?? undefined,
          password: undefined,
          email: editing.email,
          phone: editing.phone,
          status: editing.status === 1,
          role_ids: editing.roles?.map((r) => r.id) ?? [],
        })
      } else {
        form.resetFields()
        form.setFieldsValue({ status: true, dept_id: prefillDept } as Partial<UserFormValues>)
      }
    }
    onOpenChange(next)
  }

  const handleSubmit = async (values: UserFormValues) => {
    const payload = {
      nickname: values.nickname,
      dept_id: values.dept_id ?? null,
      leader_id: values.leader_id ?? null,
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
    onSuccess()
    return true
  }

  return (
    <ModalForm<UserFormValues>
      title={editing ? '编辑用户' : '新增用户'}
      form={form}
      open={open}
      onOpenChange={handleOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={640}
      grid
    >
      {isRoot && (
        <Col span={24}>
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="超级管理员账户受系统保护:密码/角色/状态不可在此修改(改密请前往个人中心),仅资料字段可修改"
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
      {!isRoot && (
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
      )}
      <ProFormText
        name="email"
        label="邮箱"
        rules={[{ type: 'email', message: '邮箱格式不正确' }]}
        colProps={{ span: 12 }}
      />
      <ProFormText name="phone" label="手机号" colProps={{ span: 12 }} />
      <Col span={12}>
        <ProForm.Item name="role_ids" label="角色">
          <Select mode="multiple" allowClear placeholder="选择角色" options={roleOptions} disabled={isRoot} />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="status" label="状态" valuePropName="checked">
          <Switch checkedChildren="正常" unCheckedChildren="停用" disabled={isRoot} />
        </ProForm.Item>
      </Col>
    </ModalForm>
  )
}
