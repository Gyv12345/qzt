import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type {
  CreatePermissionDto,
  PermissionControllerFindAllPermissionsParams,
} from "@/models";

// 权限列表查询
export function usePermissions(
  params?: PermissionControllerFindAllPermissionsParams,
) {
  return useQuery({
    queryKey: ["permissions", params],
    queryFn: async () => {
      const { permissionControllerFindAllPermissions } = getScrmApi();
      return await permissionControllerFindAllPermissions(params);
    },
  });
}

// 创建权限
export function useCreatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePermissionDto) => {
      const { permissionControllerCreatePermission } = getScrmApi();
      return await permissionControllerCreatePermission(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
      toast.success("权限创建成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "创建失败");
    },
  });
}

// 更新权限
export function useUpdatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: CreatePermissionDto;
    }) => {
      const { permissionControllerUpdatePermission } = getScrmApi();
      return await permissionControllerUpdatePermission(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
      toast.success("权限更新成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失败");
    },
  });
}

// 删除权限
export function useDeletePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { permissionControllerRemovePermission } = getScrmApi();
      return await permissionControllerRemovePermission(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
      toast.success("权限删除成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "删除失败");
    },
  });
}
