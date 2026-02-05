import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getScrmApi } from '@/services/api'
import type { CreateAutomationRuleDto, UpdateAutomationRuleDto } from '@/models'

export function useAutomationRules() {
  return useQuery({
    queryKey: ['automation', 'rules'],
    queryFn: async () => {
      const { automationControllerFindAllRules } = getScrmApi()
      return await automationControllerFindAllRules() as any
    },
  })
}

export function useAutomationRule(id: string) {
  return useQuery({
    queryKey: ['automation', 'rule', id],
    queryFn: async () => {
      const { automationControllerFindOneRule } = getScrmApi()
      return await automationControllerFindOneRule(id) as any
    },
    enabled: !!id,
  })
}

export function useCreateAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAutomationRuleDto) => {
      const { automationControllerCreateRule } = getScrmApi()
      return await automationControllerCreateRule(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] })
      toast.success('自动化规则创建成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '创建失败')
    },
  })
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAutomationRuleDto }) => {
      const { automationControllerUpdateRule } = getScrmApi()
      return await automationControllerUpdateRule(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] })
      toast.success('自动化规则更新成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '更新失败')
    },
  })
}

export function useDeleteAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { automationControllerRemoveRule } = getScrmApi()
      return await automationControllerRemoveRule(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] })
      toast.success('自动化规则删除成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '删除失败')
    },
  })
}

export function useToggleAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { automationControllerToggleEnabled } = getScrmApi()
      return await automationControllerToggleEnabled(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] })
      toast.success('自动化规则状态已更新')
    },
    onError: (error: any) => {
      toast.error(error.message || '更新失败')
    },
  })
}

export function useTriggerAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { automationControllerTriggerRule } = getScrmApi()
      return await automationControllerTriggerRule(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] })
      toast.success('自动化规则已触发')
    },
    onError: (error: any) => {
      toast.error(error.message || '触发失败')
    },
  })
}
