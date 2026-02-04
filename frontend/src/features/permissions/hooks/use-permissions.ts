import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getPermissions } from '@/services/api'
import type { CreatePermissionDto } from '@/models'

// 权限列表查询
export function usePermissions(params?: {
  page?: number
  pageSize?: number
  keyword?: string
}) {
  return useQuery({
    queryKey: ['permissions', params],
    queryFn: async () => {
      return await getPermissions().permissionControllerFindAll(params)
    },
  })
}

// 创建权限
export function useCreatePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePermissionDto) => {
      return await getPermissions().permissionControllerCreate(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      toast.success('权限创建成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '创建失败')
    },
  })
}

// 更新权限
export function useUpdatePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await getPermissions().permissionControllerUpdate(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      toast.success('权限更新成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '更新失败')
    },
  })
}

// 删除权限
export function useDeletePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return await getPermissions().permissionControllerRemove(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      toast.success('权限删除成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '删除失败')
    },
  })
}
