import FormSheet, { type FormField } from './FormSheet'
import { createContact } from '../services/contact'

interface Props {
  visible: boolean
  onClose: () => void
  customerId: number
  onSubmitted?: () => void
}

/** 客户下「新增联系人」表单 */
export default function ContactSheet({ visible, onClose, customerId, onSubmitted }: Props) {
  const fields: FormField[] = [
    { name: 'name', label: '姓名', type: 'text', required: true, placeholder: '请输入姓名' },
    { name: 'phone', label: '电话', type: 'text', placeholder: '选填' },
    { name: 'email', label: '邮箱', type: 'text', placeholder: '选填' },
    { name: 'position', label: '职位', type: 'text', placeholder: '选填' },
    { name: 'department', label: '部门', type: 'text', placeholder: '选填' },
  ]

  const onSubmit = async (values: Record<string, any>) => {
    await createContact(customerId, {
      name: values.name,
      phone: values.phone,
      email: values.email,
      position: values.position,
      department: values.department,
    })
    onSubmitted?.()
  }

  return <FormSheet visible={visible} title="新增联系人" fields={fields} onClose={onClose} onSubmit={onSubmit} />
}
