import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getScrmApi } from '@/services/api'
import type { CreateCustomerDto, UpdateCustomerDto } from '@/models'

// 客户列表查询
export function useCustomers(params?: {
  page?: number
  pageSize?: number
  name?: string
  customerLevel?: number
}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const { customerControllerFindAll } = getScrmApi()
      const response = await customerControllerFindAll(params)
      return response.data as any
    },
  })
}

// 客户详情查询
export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { customerControllerFindOne } = getScrmApi()
      const response = await customerControllerFindOne(id)
      return response.data as any
    },
    enabled: !!id,
  })
}

// 创建客户
export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCustomerDto) => {
      const { customerControllerCreate } = getScrmApi()
      const response = await customerControllerCreate(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('客户创建成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '创建失败')
    },
  })
}

// 更新客户
export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCustomerDto }) => {
      const { customerControllerUpdate } = getScrmApi()
      const response = await customerControllerUpdate(id, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('客户更新成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '更新失败')
    },
  })
}

// 删除客户
export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { customerControllerRemove } = getScrmApi()
      const response = await customerControllerRemove(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('客户删除成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '删除失败')
    },
  })
}
