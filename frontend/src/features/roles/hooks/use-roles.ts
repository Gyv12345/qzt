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
      const result = (await getScrmApi().rolesControllerFindAllRoles()) as any;
      return result as Role[];
    },
  });
}

// 创建角色
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRoleDto) => {
      return await getScrmApi().rolesControllerCreateRole(data);
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
      return await getScrmApi().rolesControllerUpdateRole(id, data);
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
      return await getScrmApi().rolesControllerRemoveRole(id);
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

// 获取角色详情
export function useRole(id: string) {
  return useQuery<Role>({
    queryKey: ["roles", id],
    queryFn: async () => {
      const result = (await getScrmApi().rolesControllerFindOneRole(id)) as any;
      return result as Role;
    },
    enabled: !!id,
  });
}

// 获取角色的菜单列表
export function useRoleMenus(roleId: string) {
  return useQuery<string[]>({
    queryKey: ["roles", roleId, "menus"],
    queryFn: async () => {
      const result = (await getScrmApi().rolesControllerGetRoleMenus(
        roleId,
      )) as any;
      return (result || []).map((m: any) => m.id);
    },
    enabled: !!roleId,
  });
}

// 分配菜单给角色
export function useAssignMenusToRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      menuIds,
    }: {
      roleId: string;
      menuIds: string[];
    }) => {
      // API 类型暂时不完整（后端未运行），使用 as any 绕过
      return await (getScrmApi() as any).rolesControllerAssignMenusToRole(
        roleId,
        {
          menuIds,
        },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles", variables.roleId] });
      queryClient.invalidateQueries({
        queryKey: ["roles", variables.roleId, "menus"],
      });
      toast.success("菜单分配成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "分配失败");
    },
  });
}

// 角色列表选择器 Hook（用于用户表单等场景）
export function useRolesList() {
  return useQuery<Array<{ label: string; value: string }>>({
    queryKey: ["roles-list"],
    queryFn: async () => {
      const result = (await getScrmApi().rolesControllerFindAllRoles()) as any;
      return (result || []).map((r: any) => ({ label: r.name, value: r.id }));
    },
  });
}
