import { Form, Input, Popup, Selector, Button, Toast } from 'antd-mobile'
import { useRef, useState } from 'react'
import { createLead, updateLead } from '../services/crm'
import type { CrmLead } from '../types/crm'
import CustomFieldEditor, { type CustomFieldEditorHandle } from './CustomFieldEditor'

interface Props {
  visible: boolean
  onClose: () => void
  /** 编辑时传入;不传为新建 */
  lead?: CrmLead | null
  /** 编辑回填的自定义字段值 */
  fields?: Record<string, string> | null
  onSubmitted?: () => void
}

const LEVEL_OPTIONS = [
  { label: 'A级', value: 'A' },
  { label: 'B级', value: 'B' },
  { label: 'C级', value: 'C' },
]

/** 线索新建/编辑表单(基本字段 + 移动端可见的自定义字段) */
export default function LeadFormSheet({ visible, onClose, lead, fields, onSubmitted }: Props) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const editorRef = useRef<CustomFieldEditorHandle>(null)
  const isEdit = !!lead

  const handleFinish = async (vals: Record<string, any>) => {
    const level = Array.isArray(vals.level) ? vals.level[0] : vals.level
    const payload = {
      name: vals.name,
      contact_name: vals.contact_name || undefined,
      phone: vals.phone || undefined,
      company: vals.company || undefined,
      industry: vals.industry || undefined,
      source: vals.source || undefined,
      level: level || undefined,
      fields: editorRef.current?.getValues() || [],
    }
    setSubmitting(true)
    try {
      if (isEdit && lead) await updateLead(lead.id, payload)
      else await createLead(payload as Parameters<typeof createLead>[0])
      Toast.show({ icon: 'success', content: isEdit ? '已保存' : '已创建' })
      onSubmitted?.()
      onClose()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      destroyOnClose
      bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '85vh', overflowY: 'auto' }}
    >
      <div style={{ padding: '16px 16px 24px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>
          {isEdit ? '编辑线索' : '新建线索'}
        </div>
        <Form
          form={form}
          layout="horizontal"
          onFinish={handleFinish}
          initialValues={
            isEdit && lead
              ? {
                  name: lead.name,
                  contact_name: lead.contact_name || '',
                  phone: lead.phone || '',
                  company: lead.company || '',
                  industry: lead.industry || '',
                  source: lead.source || '',
                  level: lead.level ? [lead.level] : [],
                }
              : undefined
          }
          footer={
            <Button block color="primary" size="large" loading={submitting} onClick={() => form.submit()}>
              {isEdit ? '保存' : '创建'}
            </Button>
          }
        >
          <Form.Item name="name" label="线索名称" rules={[{ required: true, message: '请输入线索名称' }]}>
            <Input placeholder="请输入线索名称" />
          </Form.Item>
          <Form.Item name="contact_name" label="联系人">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="company" label="公司">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="level" label="级别">
            <Selector options={LEVEL_OPTIONS} columns={3} />
          </Form.Item>
          <Form.Item name="industry" label="行业">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="source" label="来源">
            <Input placeholder="选填" />
          </Form.Item>
          <CustomFieldEditor ref={editorRef} formKey="LEAD" values={fields} />
        </Form>
      </div>
    </Popup>
  )
}
