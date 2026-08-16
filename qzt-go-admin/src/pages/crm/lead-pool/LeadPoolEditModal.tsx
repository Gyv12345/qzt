import { App, Col, Form, Select, Switch } from 'antd'
import { ModalForm, ProForm, ProFormText } from '@ant-design/pro-components'
import { createLeadPool, updateLeadPool } from '../../../services/lead'
import type { CrmLeadPool } from '../../../types/lead'
import type { CrmPoolPayload } from '../../../types/crm'

export interface LeadPoolFormValues {
  name: string
  scope_dept_ids?: string[]
  scope_role_ids?: string[]
  admin_user_ids?: string[]
  enabled: boolean
  auto_recycle: boolean
}

const parseIdTags = (json: string): string[] => {
  if (!json) return []
  try {
    const arr: unknown = JSON.parse(json)
    return Array.isArray(arr) ? arr.map((v) => String(v)) : []
  } catch {
    return []
  }
}

const tagsToJson = (tags?: string[]): string => {
  const nums = (tags ?? [])
    .map((t) => Number(t))
    .filter((n) => Number.isInteger(n) && n >= 0)
  return nums.length ? JSON.stringify(nums) : ''
}

const idTagsSelectProps = {
  mode: 'tags' as const,
  open: false,
  placeholder: '输入数字 ID 后回车',
}

interface LeadPoolEditModalProps {
  open: boolean
  editing: CrmLeadPool | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

/** 线索池新增/编辑表单(ID 用 tags 输入) */
export default function LeadPoolEditModal({ open, editing, onOpenChange, onSuccess }: LeadPoolEditModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<LeadPoolFormValues>()

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.resetFields()
    } else if (editing) {
      form.setFieldsValue({
        name: editing.name,
        scope_dept_ids: parseIdTags(editing.scope_dept_ids),
        scope_role_ids: parseIdTags(editing.scope_role_ids),
        admin_user_ids: parseIdTags(editing.admin_user_ids),
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
      scope_dept_ids: tagsToJson(values.scope_dept_ids),
      scope_role_ids: tagsToJson(values.scope_role_ids),
      admin_user_ids: tagsToJson(values.admin_user_ids),
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
        <ProForm.Item name="scope_dept_ids" label="适用部门">
          <Select {...idTagsSelectProps} />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="scope_role_ids" label="适用角色">
          <Select {...idTagsSelectProps} />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="admin_user_ids" label="管理员">
          <Select {...idTagsSelectProps} />
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
