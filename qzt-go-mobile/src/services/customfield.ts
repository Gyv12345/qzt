import request from '../utils/request'
import type { CrmCustomField } from '../types/crm'

/** 查某模块的自定义字段定义(formKey: CUSTOMER/LEAD/OPPORTUNITY/CONTRACT/PRODUCT/FOLLOW_UP_RECORD) */
export const listCustomFields = (formKey: string) =>
  request.get<unknown, CrmCustomField[]>('/crm/custom-fields', { params: { form_key: formKey } })
