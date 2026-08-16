import { useEffect, useMemo, useState } from 'react'
import { App, Col, Form, Select, Switch, TreeSelect } from 'antd'
import { ModalForm, ProForm, ProFormText } from '@ant-design/pro-components'
import { createCustomerPool, updateCustomerPool } from '../../../services/crm'
import { getDepartmentTree } from '../../../services/hrm'
import { listAllRoles, listUserOptions } from '../../../services/system'
import type { CrmCustomerPool, CrmPoolPayload } from '../../../types/crm'
import type { HrmDepartment } from '../../../types/hrm'
import type { SysRole, UserOption } from '../../../types'
import { deptToTreeData, parseIdArray } from '../components/poolForm'

export interface PoolFormValues {
  name: string
  scope_dept_ids?: number[]
  scope_role_ids?: number[]
  admin_user_ids?: number[]
  enabled: boolean
  auto_recycle: boolean
}

interface PoolEditModalProps {
  open: boolean
  editing: CrmCustomerPool | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

/** 公海池新增/编辑表单(名称/适用范围/管理员/开关) */
export default function PoolEditModal({ open, editing, onOpenChange, onSuccess }: PoolEditModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<PoolFormValues>()
  const [deptTree, setDeptTree] = useState<HrmDepartment[]>([])
  const [roles, setRoles] = useState<SysRole[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const treeData = useMemo(() => deptToTreeData(deptTree), [deptTree])

  useEffect(() => {
    getDepartmentTree().then(setDeptTree).catch(() => {})
    listAllRoles().then(setRoles).catch(() => {})
    listUserOptions().then((res) => setUsers(res.list)).catch(() => {})
  }, [])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.resetFields()
    } else if (editing) {
      form.setFieldsValue({
        name: editing.name,
        scope_dept_ids: parseIdArray(editing.scope_dept_ids),
        scope_role_ids: parseIdArray(editing.scope_role_ids),
        admin_user_ids: parseIdArray(editing.admin_user_ids),
        enabled: editing.enabled === 1,
        auto_recycle: editing.auto_recycle === 1,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ enabled: true, auto_recycle: false } as Partial<PoolFormValues>)
    }
    onOpenChange(next)
  }

  const handleSubmit = async (values: PoolFormValues) => {
    const payload: CrmPoolPayload = {
      name: values.name,
      scope_dept_ids: values.scope_dept_ids?.length ? JSON.stringify(values.scope_dept_ids) : '',
      scope_role_ids: values.scope_role_ids?.length ? JSON.stringify(values.scope_role_ids) : '',
      admin_user_ids: values.admin_user_ids?.length ? JSON.stringify(values.admin_user_ids) : '',
      enabled: values.enabled ? 1 : 0,
      auto_recycle: values.auto_recycle ? 1 : 0,
    }
    if (editing) {
      await updateCustomerPool(editing.id, payload)
      message.success('公海池已更新')
    } else {
      await createCustomerPool(payload)
      message.success('公海池已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<PoolFormValues>
      title={editing ? '编辑公海池' : '新增公海池'}
      form={form}
      open={open}
      onOpenChange={handleOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={640}
      grid
    >
      <ProFormText
        name="name"
        label="名称"
        rules={[{ required: true, message: '请输入公海池名称' }]}
        colProps={{ span: 12 }}
      />
      <Col span={12}>
        <ProForm.Item
          name="scope_dept_ids"
          label="适用部门"
          tooltip="选中部门的成员可见并领取该公海池内的线索/客户;留空表示全部部门可见"
        >
          <TreeSelect
            multiple
            treeData={treeData}
            showSearch
            treeNodeFilterProp="title"
            placeholder="选择可见部门(留空=全部)"
            style={{ width: '100%' }}
            allowClear
          />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item
          name="scope_role_ids"
          label="适用角色"
          tooltip="选中角色可见该公海池;留空表示不限角色"
        >
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder="选择可见角色(留空=全部)"
            options={roles.map((r) => ({ label: r.name, value: r.id }))}
            allowClear
          />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item
          name="admin_user_ids"
          label="管理员"
          tooltip="公海池负责人,可将池内线索/客户分配给指定成员"
        >
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder="选择公海管理员"
            options={users.map((u) => ({ label: `${u.nickname}(${u.username})`, value: u.id }))}
            allowClear
          />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="enabled" label="启用" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="auto_recycle" label="自动回收" valuePropName="checked">
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </ProForm.Item>
      </Col>
    </ModalForm>
  )
}
