import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type { CreateContractDto, UpdateContractDto } from "@/models";

// 合同列表查询
export function useContracts(params?: {
  page?: number;
  pageSize?: number;
  customerId?: string;
}) {
  return useQuery({
    queryKey: ["contracts", params],
    queryFn: async () => {
      const { contractControllerFindAll } = getScrmApi();
      return (await contractControllerFindAll(params)) as any;
    },
  });
}

// 合同详情查询
export function useContract(id: string) {
  return useQuery({
    queryKey: ["contract", id],
    queryFn: async () => {
      const { contractControllerFindOne } = getScrmApi();
      return (await contractControllerFindOne(id)) as any;
    },
    enabled: !!id,
  });
}

// 创建合同
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContractDto) => {
      const { contractControllerCreate } = getScrmApi();
      return await contractControllerCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("合同创建成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "创建失败");
    },
  });
}

// 更新合同
export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateContractDto;
    }) => {
      const { contractControllerUpdate } = getScrmApi();
      return await contractControllerUpdate(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("合同更新成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失败");
    },
  });
}

// 删除合同
export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { contractControllerRemove } = getScrmApi();
      return await contractControllerRemove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("合同删除成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "删除失败");
    },
  });
}

// 更新收款状态
export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { contractControllerUpdatePaymentStatus } = getScrmApi();
      return await contractControllerUpdatePaymentStatus(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("收款状态已更新");
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失败");
    },
  });
}
