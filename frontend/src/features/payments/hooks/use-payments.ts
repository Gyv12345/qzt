import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentControllerFindAllParams,
} from "@/models";

export function usePayments(params?: PaymentControllerFindAllParams) {
  return useQuery({
    queryKey: ["payments", params],
    queryFn: async () => {
      const { paymentControllerFindAll } = getScrmApi();
      return (await paymentControllerFindAll(params)) as any;
    },
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ["payment", id],
    queryFn: async () => {
      const { paymentControllerFindOne } = getScrmApi();
      return (await paymentControllerFindOne(id)) as any;
    },
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentDto) => {
      const { paymentControllerCreate } = getScrmApi();
      return await paymentControllerCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("收款记录创建成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "创建失败");
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePaymentDto;
    }) => {
      const { paymentControllerUpdate } = getScrmApi();
      return await paymentControllerUpdate(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("收款记录更新成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失败");
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { paymentControllerRemove } = getScrmApi();
      return await paymentControllerRemove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("收款记录删除成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "删除失败");
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { paymentControllerConfirmPayment } = getScrmApi();
      return await paymentControllerConfirmPayment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("收款已确认");
    },
    onError: (error: any) => {
      toast.error(error.message || "确认失败");
    },
  });
}
