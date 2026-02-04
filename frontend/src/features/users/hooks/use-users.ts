import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getScrmApi } from '@/services/api'
import type { CreateUserDto, UpdateUserDto } from '@/models'

// 用户列表查询
export function useUsers(params?: {
  page?: number
  pageSize?: number
  username?: string
}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const { usersControllerFindAll } = getScrmApi()
      const response = await usersControllerFindAll(params)
      return response.data as any
    },
  })
}

// 用户详情查询
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const { usersControllerFindOne } = getScrmApi()
      const response = await usersControllerFindOne(id)
      return response.data as any
    },
    enabled: !!id,
  })
}

// 创建用户
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateUserDto) => {
      const { usersControllerCreate } = getScrmApi()
      const response = await usersControllerCreate(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('用户创建成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '创建失败')
    },
  })
}

// 更新用户
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserDto }) => {
      const { usersControllerUpdate } = getScrmApi()
      const response = await usersControllerUpdate(id, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('用户更新成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '更新失败')
    },
  })
}

// 删除用户
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { usersControllerRemove } = getScrmApi()
      const response = await usersControllerRemove(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('用户删除成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '删除失败')
    },
  })
}
