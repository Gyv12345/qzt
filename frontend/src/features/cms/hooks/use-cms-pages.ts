/**
 * CMS 页面管理相关 Hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCms } from "@/services/api";
import type { CmsControllerFindAllPagesParams } from "@/services/api";

// 获取页面列表
export function useCmsPages(params?: CmsControllerFindAllPagesParams) {
  const { cmsControllerFindAllPages } = getCms();

  return useQuery({
    queryKey: ["cms-pages", params],
    queryFn: () => cmsControllerFindAllPages(params),
  });
}

// 获取单个页面
export function useCmsPage(id: string) {
  const { cmsControllerFindOnePage } = getCms();

  return useQuery({
    queryKey: ["cms-page", id],
    queryFn: () => cmsControllerFindOnePage(id),
    enabled: !!id,
  });
}

// 创建页面
export function useCreatePage() {
  const queryClient = useQueryClient();
  const { cmsControllerCreatePage } = getCms();

  return useMutation({
    mutationFn: cmsControllerCreatePage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
    },
  });
}

// 更新页面
export function useUpdatePage() {
  const queryClient = useQueryClient();
  const { cmsControllerUpdatePage } = getCms();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      cmsControllerUpdatePage(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
      queryClient.invalidateQueries({ queryKey: ["cms-page", variables.id] });
    },
  });
}

// 删除页面
export function useDeletePage() {
  const queryClient = useQueryClient();
  const { cmsControllerDeletePage } = getCms();

  return useMutation({
    mutationFn: cmsControllerDeletePage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
    },
  });
}

// 发布页面
export function usePublishPage() {
  const queryClient = useQueryClient();
  const { cmsControllerPublishPage } = getCms();

  return useMutation({
    mutationFn: cmsControllerPublishPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
    },
  });
}

// 取消发布页面
export function useUnpublishPage() {
  const queryClient = useQueryClient();
  const { cmsControllerUnpublishPage } = getCms();

  return useMutation({
    mutationFn: cmsControllerUnpublishPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
    },
  });
}
