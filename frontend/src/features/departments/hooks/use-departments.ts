import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getDepartments } from '@/services/api'
import type { CreateDepartmentDto, UpdateDepartmentDto } from '@/models'

// 部门列表查询
export function useDepartments(params?: {
  page?: number
  pageSize?: number
  keyword?: string
}) {
  return useQuery({
    queryKey: ['departments', params],
    queryFn: async () => {
      return await getDepartments().departmentControllerFindTree()
    },
  })
}

// 部门详情查询
export function useDepartment(id: string) {
  return useQuery({
    queryKey: ['department', id],
    queryFn: async () => {
      return await getDepartments().departmentControllerFindOne(id)
    },
    enabled: !!id,
  })
}

// 创建部门
export function useCreateDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateDepartmentDto) => {
      return await getDepartments().departmentControllerCreate(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success('部门创建成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '创建失败')
    },
  })
}

// 更新部门
export function useUpdateDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDepartmentDto }) => {
      return await getDepartments().departmentControllerUpdate(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success('部门更新成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '更新失败')
    },
  })
}

// 删除部门
export function useDeleteDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return await getDepartments().departmentControllerRemove(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success('部门删除成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '删除失败')
    },
  })
}
