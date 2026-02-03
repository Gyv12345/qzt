import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScrmApi } from './api'

export function useProducts(params?: any) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => getScrmApi().productControllerFindAll(params),
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => getScrmApi().productControllerFindOne({ id }),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => getScrmApi().productControllerCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      getScrmApi().productControllerUpdate({ id, updateProductDto: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => getScrmApi().productControllerRemove({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
