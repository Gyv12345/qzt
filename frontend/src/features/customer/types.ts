export interface Customer {
  id: string
  name: string
  customerLevel: 'VIP' | 'NORMAL'
  industry?: string
  contact: string
  phone: string
  email?: string
  address?: string
  taxNumber?: string
  bankName?: string
  bankAccount?: string
  createdAt: string
  updatedAt: string
}

export interface CustomerListResponse {
  data: Customer[]
  total: number
  page: number
  pageSize: number
}
