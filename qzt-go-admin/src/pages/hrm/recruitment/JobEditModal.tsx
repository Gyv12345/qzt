import { useEffect } from 'react'
import { App } from 'antd'
import { ModalForm, ProForm, ProFormDigit, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { createJob, listJobs, updateJob } from '../../../services/hrm'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  title: string
  dept_name?: string
  headcount?: number
  salary_range?: string
  education?: string
  experience?: string
  description?: string
  requirement?: string
}

export default function JobEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    if (editingId) {
      listJobs({ page: 1, page_size: 1 }).then(async (res) => {
        // 需要拿详情,用 list 找到匹配
        const j = res.list.find((x) => x.id === editingId)
        if (j) {
          form.setFieldsValue({
            title: j.title,
            dept_name: j.dept_name,
            headcount: j.headcount,
            salary_range: j.salary_range,
            education: j.education,
            experience: j.experience,
            description: j.description,
            requirement: j.requirement,
          })
        }
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ headcount: 1 })
    }
  }, [open, editingId])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      dept_name: values.dept_name || '',
      headcount: values.headcount || 1,
      salary_range: values.salary_range || '',
      education: values.education || '',
      experience: values.experience || '',
      description: values.description || '',
      requirement: values.requirement || '',
    }
    if (editingId) {
      await updateJob(editingId, payload)
      message.success('已更新')
    } else {
      await createJob(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑职位' : '新增职位'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={680}
    >
      <ProFormText name="title" label="职位名称" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 12 }} />
      <ProFormText name="dept_name" label="部门" colProps={{ span: 12 }} />
      <ProFormDigit name="headcount" label="招聘人数" min={1} colProps={{ span: 12 }} />
      <ProFormText name="salary_range" label="薪资范围" placeholder="如 15k-25k" colProps={{ span: 12 }} />
      <ProFormText name="education" label="学历要求" placeholder="如 本科" colProps={{ span: 12 }} />
      <ProFormText name="experience" label="经验要求" placeholder="如 3-5年" colProps={{ span: 12 }} />
      <ProFormTextArea name="description" label="职位描述" colProps={{ span: 24 }} />
      <ProFormTextArea name="requirement" label="任职要求" colProps={{ span: 24 }} />
    </ModalForm>
  )
}
