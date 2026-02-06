import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type { CreateRoleDto, UpdateRoleDto } from "@/models";
import type { Role } from "../data/schema";

// 角色列表查询
// 注意：API 返回类型因后端未运行导致 Orval 生成 void，使用 as any 绕过类型检查
export function useRoles() {
  return useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const result =
        (await getScrmApi().permissionControllerFindAllRoles()) as any;
      return result as Role[];
    },
  });
}

// 创建角色
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRoleDto) => {
      return await getScrmApi().permissionControllerCreateRole(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("角色创建成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "创建失败");
    },
  });
}

// 更新角色
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRoleDto }) => {
      return await getScrmApi().permissionControllerUpdateRole(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("角色更新成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失败");
    },
  });
}

// 删除角色
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await getScrmApi().permissionControllerRemoveRole(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("角色删除成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "删除失败");
    },
  });
}
