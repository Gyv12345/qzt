import { Dialog, Form, Input, Popup, Selector, Button, Toast } from 'antd-mobile'
import { useRef, useState } from 'react'
import { createCustomer, dedup, updateCustomer } from '../services/crm'
import type { CrmCustomerDetail } from '../types/crm'
import CustomFieldEditor, { type CustomFieldEditorHandle } from './CustomFieldEditor'

interface Props {
  visible: boolean
  onClose: () => void
  /** 编辑时传入客户详情;不传为新建 */
  detail?: CrmCustomerDetail | null
  onSubmitted?: () => void
}

const LEVEL_OPTIONS = [
  { label: '重要(A)', value: 'A' },
  { label: '普通(B)', value: 'B' },
  { label: '低价值(C)', value: 'C' },
]

/** 客户新建/编辑表单(基本字段 + 移动端可见的自定义字段) */
export default function CustomerFormSheet({ visible, onClose, detail, onSubmitted }: Props) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const editorRef = useRef<CustomFieldEditorHandle>(null)
  const isEdit = !!detail
  const c = detail?.customer

  const handleFinish = async (vals: Record<string, any>) => {
    const level = Array.isArray(vals.level) ? vals.level[0] : vals.level
    const payload = {
      name: vals.name,
      level: level || undefined,
      industry: vals.industry || undefined,
      source: vals.source || undefined,
      fields: editorRef.current?.getValues() || [],
    }
    // 新建时查重(名称相似 + 电话重复,跨客户与线索)
    if (!isEdit) {
      try {
        const dup = await dedup({ name: vals.name })
        const count = (dup.customers?.length || 0) + (dup.leads?.length || 0)
        if (count > 0) {
          const ok = await Dialog.confirm({ content: `检测到 ${count} 条相似客户/线索记录,是否继续创建?` })
          if (!ok) return
        }
      } catch {
        // 查重失败不阻塞创建
      }
    }
    setSubmitting(true)
    try {
      if (isEdit && c) await updateCustomer(c.id, payload)
      else await createCustomer(payload as Parameters<typeof createCustomer>[0])
      Toast.show({ icon: 'success', content: isEdit ? '已保存' : '已创建' })
      onSubmitted?.()
      onClose()
    } catch {
      // 拦截器已 toast
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
          {isEdit ? '编辑客户' : '新建客户'}
        </div>
        <Form
          form={form}
          layout="horizontal"
          onFinish={handleFinish}
          initialValues={
            isEdit && c
              ? {
                  name: c.name,
                  level: c.level ? [c.level] : [],
                  industry: c.industry || '',
                  source: c.source || '',
                }
              : undefined
          }
          footer={
            <Button block color="primary" size="large" loading={submitting} onClick={() => form.submit()}>
              {isEdit ? '保存' : '创建'}
            </Button>
          }
        >
          <Form.Item name="name" label="客户名称" rules={[{ required: true, message: '请输入客户名称' }]}>
            <Input placeholder="请输入客户名称" />
          </Form.Item>
          <Form.Item name="level" label="客户级别">
            <Selector options={LEVEL_OPTIONS} columns={3} />
          </Form.Item>
          <Form.Item name="industry" label="行业">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="source" label="来源">
            <Input placeholder="选填" />
          </Form.Item>
          <CustomFieldEditor ref={editorRef} formKey="CUSTOMER" values={detail?.fields} />
        </Form>
      </div>
    </Popup>
  )
}
