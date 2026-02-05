import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getScrmApi } from '@/services/api'
import type { CreateContactDto, UpdateContactDto } from '@/models'

export function useContacts(params?: { page?: number; pageSize?: number; customerId?: string }) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: async () => {
      const { contactControllerFindAll } = getScrmApi()
      return await contactControllerFindAll(params) as any
    },
  })
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const { contactControllerFindOne } = getScrmApi()
      return await contactControllerFindOne(id) as any
    },
    enabled: !!id,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateContactDto) => {
      const { contactControllerCreate } = getScrmApi()
      return await contactControllerCreate(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('联系人创建成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '创建失败')
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateContactDto }) => {
      const { contactControllerUpdate } = getScrmApi()
      return await contactControllerUpdate(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('联系人更新成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '更新失败')
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { contactControllerRemove } = getScrmApi()
      return await contactControllerRemove(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('联系人删除成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '删除失败')
    },
  })
}
