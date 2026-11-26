import { useEffect } from 'react'
import { App } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import {
  ModalForm,
  ProForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components'
import UserSelect from '../../components/UserSelect'
import { createTask, updateTask } from '../../services/project'
import { PRIORITY_MAP, TASK_STATUS, type ProjTask } from '../../types/project'

interface TaskEditModalProps {
  open: boolean
  projectId: number
  /** null = 新建,否则编辑回填 */
  task: ProjTask | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  title: string
  description?: string
  assignee_id?: number
  status?: number
  priority?: number
  start_date?: string
  due_date?: string
  progress?: number
  is_milestone?: boolean
}

/** 表单日期值(字符串或 dayjs)统一转 YYYY-MM-DD 字符串,空值返回 undefined(可空字段) */
const toDateStr = (v: unknown): string | undefined => {
  if (!v) return undefined
  const d = (typeof v === 'string' ? dayjs(v) : (v as Dayjs))
  return d.isValid() ? d.format('YYYY-MM-DD') : undefined
}

/** 任务新增/编辑弹窗(P33:支持开始日期/进度/里程碑) */
export default function TaskEditModal({ open, projectId, task, onOpenChange, onSuccess }: TaskEditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    if (task) {
      form.setFieldsValue({
        title: task.title,
        description: task.description,
        assignee_id: task.assignee_id || undefined,
        status: task.status || 1,
        priority: task.priority || 2,
        start_date: task.start_date?.slice(0, 10) || undefined,
        due_date: task.due_date?.slice(0, 10) || undefined,
        progress: task.progress ?? 0,
        is_milestone: task.is_milestone === 1,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ status: 1, priority: 2, progress: 0, is_milestone: false })
    }
  }, [open, task, form])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      description: values.description || '',
      assignee_id: values.assignee_id,
      status: values.status,
      priority: values.priority,
      start_date: toDateStr(values.start_date),
      due_date: toDateStr(values.due_date),
      progress: values.progress ?? 0,
      is_milestone: (values.is_milestone ? 1 : 0) as 0 | 1,
    }
    if (task) {
      await updateTask(task.id, payload)
      message.success('任务已更新')
    } else {
      await createTask({ project_id: projectId, ...payload })
      message.success('任务已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={task ? '编辑任务' : '新建任务'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={640}
      grid
    >
      <ProFormText
        name="title"
        label="任务标题"
        rules={[{ required: true, message: '请输入任务标题' }]}
        colProps={{ span: 24 }}
      />
      <ProForm.Item name="assignee_id" label="负责人" colProps={{ span: 12 }}>
        <UserSelect placeholder="选择负责人" />
      </ProForm.Item>
      <ProFormSelect
        name="status"
        label="状态"
        options={Object.entries(TASK_STATUS).map(([k, v]) => ({ label: v.text, value: Number(k) }))}
        colProps={{ span: 12 }}
      />
      <ProFormSelect
        name="priority"
        label="优先级"
        options={Object.entries(PRIORITY_MAP).map(([k, v]) => ({ label: v.text, value: Number(k) }))}
        colProps={{ span: 12 }}
      />
      <ProFormDatePicker
        name="start_date"
        label="开始日期(可空)"
        fieldProps={{ style: { width: '100%' } }}
        transform={(v: unknown) => toDateStr(v)}
        colProps={{ span: 12 }}
      />
      <ProFormDatePicker
        name="due_date"
        label="截止日期"
        fieldProps={{ style: { width: '100%' } }}
        transform={(v: unknown) => toDateStr(v)}
        colProps={{ span: 12 }}
      />
      <ProFormDigit
        name="progress"
        label="进度(%)"
        min={0}
        max={100}
        precision={0}
        fieldProps={{ style: { width: '100%' } }}
        colProps={{ span: 12 }}
      />
      <ProFormSwitch
        name="is_milestone"
        label="里程碑"
        checkedChildren="是"
        unCheckedChildren="否"
        colProps={{ span: 12 }}
      />
      <ProFormTextArea name="description" label="任务描述" colProps={{ span: 24 }} />
    </ModalForm>
  )
}
