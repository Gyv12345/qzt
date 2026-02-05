import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getScrmApi } from '@/services/api'
import type { CreateRoleDto, UpdateRoleDto } from '@/models'

// 角色列表查询
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      return await getScrmApi().permissionControllerFindAllRoles()
    },
  })
}

// 创建角色
export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateRoleDto) => {
      return await getScrmApi().permissionControllerCreateRole(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success('角色创建成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '创建失败')
    },
  })
}

// 更新角色
export function useUpdateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRoleDto }) => {
      return await getScrmApi().permissionControllerUpdateRole(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success('角色更新成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '更新失败')
    },
  })
}

// 删除角色
export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return await getScrmApi().permissionControllerRemoveRole(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success('角色删除成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '删除失败')
    },
  })
}
