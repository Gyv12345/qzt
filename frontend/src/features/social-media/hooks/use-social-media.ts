/**
 * 新媒体管理 Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";

// ==================== 账号管理 ====================

/**
 * 获取账号列表
 */
export function useSocialMediaAccounts(params?: any) {
  return useQuery({
    queryKey: ["social-media-accounts", params],
    queryFn: () => getScrmApi().socialMediaAccountControllerFindAll(params),
    select: (data) => {
      // TODO(human): 根据实际 API 响应结构调整
      // 这里假设返回 { total, data, ... } 格式
      return data as any;
    },
  });
}

/**
 * 创建账号
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      getScrmApi().socialMediaAccountControllerCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-media-accounts"] });
      toast.success("账号添加成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "账号添加失败");
    },
  });
}

/**
 * 更新账号
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      getScrmApi().socialMediaAccountControllerUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-media-accounts"] });
      toast.success("账号更新成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "账号更新失败");
    },
  });
}

/**
 * 删除账号
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      getScrmApi().socialMediaAccountControllerDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-media-accounts"] });
      toast.success("账号删除成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "账号删除失败");
    },
  });
}

/**
 * 刷新令牌
 */
export function useRefreshToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      getScrmApi().socialMediaAccountControllerRefreshToken(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-media-accounts"] });
      toast.success("令牌刷新成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "令牌刷新失败");
    },
  });
}

/**
 * 验证账号
 */
export function useValidateAccount() {
  return useMutation({
    mutationFn: (id: string) =>
      getScrmApi().socialMediaAccountControllerValidateAccount(id),
    onSuccess: () => {
      toast.success("账号验证成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "账号验证失败");
    },
  });
}

// ==================== 内容管理 ====================

/**
 * 获取内容列表
 */
export function useSocialMediaPosts(params?: any) {
  return useQuery({
    queryKey: ["social-media-posts", params],
    queryFn: () => getScrmApi().socialMediaPostControllerFindAll(params),
    select: (data) => {
      return data as any;
    },
  });
}

/**
 * 获取内容详情
 */
export function useSocialMediaPost(id?: string) {
  return useQuery({
    queryKey: ["social-media-post", id],
    queryFn: () => getScrmApi().socialMediaPostControllerFindOne(id!),
    enabled: !!id,
  });
}

/**
 * 创建内容
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      getScrmApi().socialMediaPostControllerCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-media-posts"] });
      toast.success("内容创建成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "内容创建失败");
    },
  });
}

/**
 * 更新内容
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      getScrmApi().socialMediaPostControllerUpdate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["social-media-posts"] });
      queryClient.invalidateQueries({
        queryKey: ["social-media-post", variables.id],
      });
      toast.success("内容更新成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "内容更新失败");
    },
  });
}

/**
 * 删除内容
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      getScrmApi().socialMediaPostControllerDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-media-posts"] });
      toast.success("内容删除成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "内容删除失败");
    },
  });
}

/**
 * 发布内容
 */
export function usePublishPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      getScrmApi().socialMediaPostControllerPublish(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-media-posts"] });
      toast.success("内容发布成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "内容发布失败");
    },
  });
}

/**
 * 定时发布
 */
export function useSchedulePublish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      getScrmApi().socialMediaPostControllerSchedulePublish(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-media-posts"] });
      toast.success("定时发布设置成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "定时发布设置失败");
    },
  });
}

/**
 * 取消定时发布
 */
export function useCancelScheduled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      getScrmApi().socialMediaPostControllerCancelScheduled(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-media-posts"] });
      toast.success("已取消定时发布");
    },
    onError: (error: Error) => {
      toast.error(error.message || "取消失败");
    },
  });
}

/**
 * 批量发布
 */
export function useBatchPublish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      getScrmApi().socialMediaPostControllerBatchPublish(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-media-posts"] });
      toast.success("批量发布成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "批量发布失败");
    },
  });
}

/**
 * 获取发布日志
 */
export function usePublishLogs(postId?: string) {
  return useQuery({
    queryKey: ["publish-logs", postId],
    queryFn: () => {
      if (postId) {
        return getScrmApi().socialMediaPostControllerGetPublishLogs(postId);
      }
      return getScrmApi().socialMediaPostControllerGetAllPublishLogs();
    },
    enabled: !!postId,
  });
}

/**
 * 获取所有发布日志
 */
export function useAllPublishLogs() {
  return useQuery({
    queryKey: ["publish-logs"],
    queryFn: () => getScrmApi().socialMediaPostControllerGetAllPublishLogs(),
  });
}
