import { useEffect, useMemo, useState } from 'react'
import { App, Col, Form, Select, Switch, TreeSelect } from 'antd'
import { ModalForm, ProForm, ProFormText } from '@ant-design/pro-components'
import { createLeadPool, updateLeadPool } from '../../../services/lead'
import { getDepartmentTree } from '../../../services/hrm'
import { listAllRoles, listUserOptions } from '../../../services/system'
import type { CrmLeadPool } from '../../../types/lead'
import type { CrmPoolPayload } from '../../../types/crm'
import type { HrmDepartment } from '../../../types/hrm'
import type { SysRole, UserOption } from '../../../types'
import { deptToTreeData, parseIdArray } from '../components/poolForm'

export interface LeadPoolFormValues {
  name: string
  scope_dept_ids?: number[]
  scope_role_ids?: number[]
  admin_user_ids?: number[]
  enabled: boolean
  auto_recycle: boolean
}

interface LeadPoolEditModalProps {
  open: boolean
  editing: CrmLeadPool | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

/** 线索池新增/编辑表单(部门树/角色/用户选择器,与客户池一致) */
export default function LeadPoolEditModal({ open, editing, onOpenChange, onSuccess }: LeadPoolEditModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<LeadPoolFormValues>()
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
      form.setFieldsValue({ enabled: true, auto_recycle: false } as Partial<LeadPoolFormValues>)
    }
    onOpenChange(next)
  }

  const handleSubmit = async (values: LeadPoolFormValues) => {
    const payload: CrmPoolPayload = {
      name: values.name,
      scope_dept_ids: values.scope_dept_ids?.length ? JSON.stringify(values.scope_dept_ids) : '',
      scope_role_ids: values.scope_role_ids?.length ? JSON.stringify(values.scope_role_ids) : '',
      admin_user_ids: values.admin_user_ids?.length ? JSON.stringify(values.admin_user_ids) : '',
      enabled: values.enabled ? 1 : 0,
      auto_recycle: values.auto_recycle ? 1 : 0,
    }
    if (editing) {
      await updateLeadPool(editing.id, payload)
      message.success('线索池已更新')
    } else {
      await createLeadPool(payload)
      message.success('线索池已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<LeadPoolFormValues>
      title={editing ? '编辑线索池' : '新增线索池'}
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
        rules={[{ required: true, message: '请输入线索池名称' }]}
        colProps={{ span: 12 }}
      />
      <Col span={12}>
        <ProForm.Item
          name="scope_dept_ids"
          label="适用部门"
          tooltip="选中部门的成员可见并领取该公海池内的线索;留空表示全部部门可见"
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
          tooltip="公海池负责人,可将池内线索分配给指定成员"
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
