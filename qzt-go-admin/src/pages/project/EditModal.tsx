import { useEffect } from 'react'
import { App } from 'antd'
import { ModalForm, ProForm, ProFormDatePicker, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import CustomerSelect from '../../components/CustomerSelect'
import UserSelect from '../../components/UserSelect'
import { createProject, getProject, updateProject } from '../../services/project'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  name: string
  description?: string
  customer_id?: number
  contract_id?: number
  manager_id?: number
  priority: number
  start_date?: string
  end_date?: string
  tags?: string
}

const PRIORITY_OPTIONS = [
  { label: '低', value: 1 },
  { label: '中', value: 2 },
  { label: '高', value: 3 },
  { label: '紧急', value: 4 },
]

export default function ProjectEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    if (editingId) {
      getProject(editingId).then((detail) => {
        const p = detail.project
        form.setFieldsValue({
          name: p.name,
          description: p.description,
          customer_id: p.customer_id || undefined,
          contract_id: p.contract_id || undefined,
          manager_id: p.manager_id || undefined,
          priority: p.priority,
          start_date: p.start_date ? p.start_date.slice(0, 10) : undefined,
          end_date: p.end_date?.slice(0, 10),
          tags: p.tags,
        })
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ priority: 2 })
    }
  }, [open, editingId, form])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      description: values.description || '',
      customer_id: values.customer_id,
      contract_id: values.contract_id,
      manager_id: values.manager_id,
      priority: values.priority,
      start_date: values.start_date || '',
      end_date: values.end_date || '',
      tags: values.tags || '',
    }
    if (editingId) {
      await updateProject(editingId, payload)
      message.success('已更新')
    } else {
      await createProject(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑项目' : '新建项目'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={680}
      grid
    >
      <ProFormText name="name" label="项目名称" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 24 }} />
      <ProForm.Item name="customer_id" label="关联客户" colProps={{ span: 12 }}>
        <CustomerSelect placeholder="选择客户" />
      </ProForm.Item>
      <ProForm.Item name="manager_id" label="项目经理" colProps={{ span: 12 }}>
        <UserSelect placeholder="选择经理" />
      </ProForm.Item>
      <ProFormSelect name="priority" label="优先级" options={PRIORITY_OPTIONS} colProps={{ span: 12 }} />
      <ProFormDatePicker name="start_date" label="开始日期" colProps={{ span: 12 }} />
      <ProFormDatePicker name="end_date" label="计划完成日期" colProps={{ span: 12 }} />
      <ProFormText name="tags" label="标签" placeholder="多个标签逗号分隔" colProps={{ span: 12 }} />
      <ProFormTextArea name="description" label="项目描述" colProps={{ span: 24 }} />
    </ModalForm>
  )
}
