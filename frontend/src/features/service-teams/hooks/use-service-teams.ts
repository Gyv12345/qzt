import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";

// 分页参数类型
export interface ServiceTeamParams {
  page?: number;
  pageSize?: number;
  customerId?: string;
  userId?: string;
  roleCode?: string;
}

// 获取服务团队列表
export function useServiceTeams(params?: ServiceTeamParams) {
  return useQuery({
    queryKey: ["service-teams", params],
    queryFn: async () => {
      const { serviceTeamControllerFindAll } = getScrmApi();
      const response = await serviceTeamControllerFindAll(params || {});
      return response;
    },
  });
}

// 获取服务团队详情
export function useServiceTeam(id: string) {
  return useQuery({
    queryKey: ["service-teams", id],
    queryFn: async () => {
      const { serviceTeamControllerFindOne } = getScrmApi();
      return await serviceTeamControllerFindOne(id);
    },
    enabled: !!id,
  });
}

// 获取客户的服务团队（按角色分组）
export function useCustomerServiceTeam(customerId: string) {
  return useQuery({
    queryKey: ["service-teams", "customer", customerId],
    queryFn: async () => {
      const { serviceTeamControllerGetCustomerTeamGrouped } = getScrmApi();
      return await serviceTeamControllerGetCustomerTeamGrouped(customerId);
    },
    enabled: !!customerId,
  });
}

// 创建服务团队成员
export function useCreateServiceTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      customerId: string;
      userId: string;
      roleCode: string;
    }) => {
      const { serviceTeamControllerCreate } = getScrmApi();
      return await serviceTeamControllerCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-teams"] });
      toast.success("服务团队成员已添加");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "添加失败，请重试");
    },
  });
}

// 更新服务团队成员
export function useUpdateServiceTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { customerId?: string; userId?: string; roleCode?: string };
    }) => {
      const { serviceTeamControllerUpdate } = getScrmApi();
      return await serviceTeamControllerUpdate(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-teams"] });
      toast.success("服务团队成员已更新");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "更新失败，请重试");
    },
  });
}

// 删除服务团队成员
export function useDeleteServiceTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { serviceTeamControllerRemove } = getScrmApi();
      return await serviceTeamControllerRemove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-teams"] });
      toast.success("服务团队成员已删除");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "删除失败，请重试");
    },
  });
}
