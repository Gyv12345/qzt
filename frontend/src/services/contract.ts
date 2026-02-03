import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScrmApi } from './api'

export function useContracts(params?: any) {
  return useQuery({
    queryKey: ['contracts', params],
    queryFn: () => getScrmApi().contractControllerFindAll(params),
  })
}

export function useContract(id: string) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: () => getScrmApi().contractControllerFindOne({ id }),
    enabled: !!id,
  })
}

export function useCreateContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => getScrmApi().contractControllerCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
  })
}

export function useUpdateContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      getScrmApi().contractControllerUpdate({ id, updateContractDto: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      queryClient.invalidateQueries({ queryKey: ['contract'] })
    },
  })
}

export function useDeleteContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => getScrmApi().contractControllerRemove({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
  })
}

export function useContractPayments(contractId: string) {
  return useQuery({
    queryKey: ['contract-payments', contractId],
    queryFn: () => getScrmApi().paymentControllerGetContractPayments({ contractId }),
    enabled: !!contractId,
  })
}
