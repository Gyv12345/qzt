import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type { UpdateCustomerRuleDto, CustomerRuleResponse } from "@/models";

// 使用 Orval 生成的类型作为导出类型，保持一致性
export type CustomerRule = CustomerRuleResponse;

// 获取所有客户规则
export function useCustomerRules() {
  return useQuery({
    queryKey: ["customer-rules"],
    queryFn: async () => {
      const { customerRuleControllerFindAll } = getScrmApi();
      return await customerRuleControllerFindAll();
    },
  });
}

// 获取单个规则
export function useCustomerRule(id: number) {
  return useQuery({
    queryKey: ["customer-rule", id],
    queryFn: async () => {
      const { customerRuleControllerFindOne } = getScrmApi();
      return await customerRuleControllerFindOne(String(id));
    },
    enabled: !!id,
  });
}

// 更新规则
export function useUpdateCustomerRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateCustomerRuleDto;
    }) => {
      const { customerRuleControllerUpdate } = getScrmApi();
      return await customerRuleControllerUpdate(String(id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-rules"] });
      toast.success("规则更新成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失败");
    },
  });
}
