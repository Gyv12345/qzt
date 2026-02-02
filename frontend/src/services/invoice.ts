import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScrmApi } from './api'

export function useInvoices(params?: any) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => getScrmApi().invoiceControllerFindAll(params),
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getScrmApi().invoiceControllerFindOne({ id }),
    enabled: !!id,
  })
}

export function useCustomerInvoiceSummary(customerId: string, month?: string) {
  return useQuery({
    queryKey: ['invoice-summary', customerId, month],
    queryFn: () =>
      getScrmApi().invoiceControllerGetCustomerSummary({
        customerId,
        month,
      }),
    enabled: !!customerId,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => getScrmApi().invoiceControllerCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-summary'] })
    },
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      getScrmApi().invoiceControllerUpdate({ id, updateInvoiceDto: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice'] })
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => getScrmApi().invoiceControllerRemove({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
