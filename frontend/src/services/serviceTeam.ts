import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScrmApi } from './api'

export function useServiceTeams(customerId?: string) {
  return useQuery({
    queryKey: ['service-teams', customerId],
    queryFn: () =>
      getScrmApi().serviceTeamControllerFindAll(
        customerId ? { customerId } : undefined,
      ),
  })
}

export function useServiceTeamGrouped(customerId: string) {
  return useQuery({
    queryKey: ['service-teams', 'grouped', customerId],
    queryFn: () =>
      getScrmApi().serviceTeamControllerGetCustomerTeamGrouped({
        customerId,
      }),
    enabled: !!customerId,
  })
}

export function useCreateServiceTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => getScrmApi().serviceTeamControllerCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-teams'] })
    },
  })
}

export function useUpdateServiceTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      getScrmApi().serviceTeamControllerUpdate({
        id,
        updateServiceTeamDto: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-teams'] })
    },
  })
}

export function useDeleteServiceTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      getScrmApi().serviceTeamControllerRemove({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-teams'] })
    },
  })
}

// 产品流程 hooks
export function useProductFlows(productId?: string) {
  return useQuery({
    queryKey: ['product-flows', productId],
    queryFn: () =>
      getScrmApi().productControllerFindFlows(
        productId ? { productId } : undefined,
      ),
  })
}

export function useProductFlow(id: string) {
  return useQuery({
    queryKey: ['product-flow', id],
    queryFn: () => getScrmApi().productControllerFindFlow({ id }),
    enabled: !!id,
  })
}

export function useCreateProductFlow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => getScrmApi().productControllerCreateFlow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-flows'] })
    },
  })
}

export function useUpdateProductFlow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      getScrmApi().productControllerUpdateFlow({
        id,
        updateProductFlowDto: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-flows'] })
      queryClient.invalidateQueries({ queryKey: ['product-flow'] })
    },
  })
}

export function useDeleteProductFlow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      getScrmApi().productControllerRemoveFlow({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-flows'] })
    },
  })
}
