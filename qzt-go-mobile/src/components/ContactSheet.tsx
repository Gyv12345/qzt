import FormSheet, { type FormField } from './FormSheet'
import { createContact, updateContact } from '../services/contact'
import type { CrmContact } from '../types/crm'

interface Props {
  visible: boolean
  onClose: () => void
  customerId: number
  /** 传入则编辑该联系人;不传为新建 */
  contact?: CrmContact | null
  onSubmitted?: () => void
}

/** 客户下联系人表单(新建 / 编辑)。编辑时传入 contact 回填 */
export default function ContactSheet({ visible, onClose, customerId, contact, onSubmitted }: Props) {
  const isEdit = !!contact
  const fields: FormField[] = [
    { name: 'name', label: '姓名', type: 'text', required: true, placeholder: '请输入姓名' },
    { name: 'phone', label: '电话', type: 'text', placeholder: '选填' },
    { name: 'email', label: '邮箱', type: 'text', placeholder: '选填' },
    { name: 'position', label: '职位', type: 'text', placeholder: '选填' },
    { name: 'department', label: '部门', type: 'text', placeholder: '选填' },
    {
      name: 'is_key_decision_maker',
      label: '关键决策人',
      type: 'select',
      options: [
        { label: '否', value: 0 },
        { label: '是', value: 1 },
      ],
    },
  ]

  // 编辑模式回填初始值(is_key_decision_maker 用单值)
  const initialValues = isEdit
    ? {
        name: contact!.name,
        phone: contact!.phone || '',
        email: contact!.email || '',
        position: contact!.position || '',
        department: contact!.department || '',
        is_key_decision_maker: contact!.is_key_decision_maker ?? 0,
      }
    : undefined

  const onSubmit = async (values: Record<string, any>) => {
    const payload = {
      name: values.name,
      phone: values.phone || undefined,
      email: values.email || undefined,
      position: values.position || undefined,
      department: values.department || undefined,
      is_key_decision_maker: values.is_key_decision_maker != null ? Number(values.is_key_decision_maker) : undefined,
    }
    if (isEdit && contact) {
      await updateContact(contact.id, payload)
    } else {
      await createContact(customerId, payload)
    }
    onSubmitted?.()
  }

  return (
    <FormSheet
      visible={visible}
      title={isEdit ? '编辑联系人' : '新增联系人'}
      fields={fields}
      initialValues={initialValues}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  )
}
