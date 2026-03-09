import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { customInstance } from "@/services/api-client";
import type { Task } from "../data/schema";

export interface TaskEntity extends Task {
  description?: string | null;
  dueDate?: string | null;
  assigneeId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListResponse {
  data: TaskEntity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TaskPayload {
  title: string;
  status: string;
  label: string;
  priority: string;
  description?: string;
  dueDate?: string;
  assigneeId?: string;
}

export function useTasks(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  priority?: string;
}) {
  return useQuery({
    queryKey: ["tasks", params],
    queryFn: () =>
      customInstance<TaskListResponse>({
        url: "/tasks",
        method: "GET",
        params,
      }),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TaskPayload) =>
      customInstance<TaskEntity>({
        url: "/tasks",
        method: "POST",
        data: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("任务创建成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "任务创建失败");
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TaskPayload> }) =>
      customInstance<TaskEntity>({
        url: `/tasks/${id}`,
        method: "PATCH",
        data: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("任务更新成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "任务更新失败");
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      customInstance<void>({
        url: `/tasks/${id}`,
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("任务删除成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "任务删除失败");
    },
  });
}
