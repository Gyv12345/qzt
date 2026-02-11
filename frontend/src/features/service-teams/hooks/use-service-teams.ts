import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type { CreateServiceTeamDto, UpdateServiceTeamDto } from "@/models";

// 分页参数类型
export interface ServiceTeamParams {
  page?: number;
  pageSize?: number;
  customerId?: string;
  userId?: string;
  roleCode?: string;
}

// 服务团队成员类型
export interface ServiceTeamItem {
  id: string;
  customerId: string;
  userId: string;
  roleCode: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    username: string;
    realName?: string;
    avatar?: string;
  };
}

// 服务团队列表响应类型
export interface ServiceTeamListResponse {
  data: ServiceTeamItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 获取服务团队列表
export function useServiceTeams(params?: ServiceTeamParams) {
  return useQuery<ServiceTeamListResponse>({
    queryKey: ["service-teams", params],
    queryFn: async () => {
      const { serviceTeamControllerFindAll } = getScrmApi();
      // 只传递 API 支持的参数
      const response = await serviceTeamControllerFindAll({
        customerId: params?.customerId || "",
      });
      return response as unknown as ServiceTeamListResponse;
    },
    enabled: !params?.customerId || params.customerId.length > 0,
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
    mutationFn: async (data: CreateServiceTeamDto) => {
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
      data: UpdateServiceTeamDto;
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
