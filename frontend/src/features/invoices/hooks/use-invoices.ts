import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type { CreateInvoiceDto, UpdateInvoiceDto } from "@/models";

export function useInvoices(params?: {
  page?: number;
  pageSize?: number;
  customerId?: string;
}) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: async () => {
      const { invoiceControllerFindAll } = getScrmApi();
      return (await invoiceControllerFindAll(params)) as any;
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { invoiceControllerFindOne } = getScrmApi();
      return (await invoiceControllerFindOne(id)) as any;
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInvoiceDto) => {
      const { invoiceControllerCreate } = getScrmApi();
      return await invoiceControllerCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("开票记录创建成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "创建失败");
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateInvoiceDto;
    }) => {
      const { invoiceControllerUpdate } = getScrmApi();
      return await invoiceControllerUpdate(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("开票记录更新成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失败");
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { invoiceControllerRemove } = getScrmApi();
      return await invoiceControllerRemove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("开票记录删除成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "删除失败");
    },
  });
}
