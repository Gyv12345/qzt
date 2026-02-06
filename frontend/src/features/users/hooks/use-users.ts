import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type { CreateUserDto, UpdateUserDto } from "@/models";

// 用户列表查询
export function useUsers(params?: {
  page?: number;
  pageSize?: number;
  username?: string;
}) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const { usersControllerFindAll } = getScrmApi();
      return await usersControllerFindAll(params);
    },
  });
}

// 用户详情查询
export function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const { usersControllerFindOne } = getScrmApi();
      return await usersControllerFindOne(id);
    },
    enabled: !!id,
  });
}

// 创建用户
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserDto) => {
      const { usersControllerCreate } = getScrmApi();
      return await usersControllerCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("用户创建成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "创建失败");
    },
  });
}

// 更新用户
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserDto }) => {
      const { usersControllerUpdate } = getScrmApi();
      return await usersControllerUpdate(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("用户更新成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失败");
    },
  });
}

// 删除用户
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { usersControllerRemove } = getScrmApi();
      return await usersControllerRemove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("用户删除成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "删除失败");
    },
  });
}
