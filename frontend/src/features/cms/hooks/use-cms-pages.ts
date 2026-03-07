/**
 * CMS 页面管理相关 Hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCms } from "@/services/api";

// 定义页面查询参数类型
interface CmsPageQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

// 定义页面响应类型
interface CmsPage {
  id: string;
  name: string;
  title: string;
  slug: string;
  description?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  elements?: any[];
  createdAt: string;
  updatedAt: string;
}

interface CmsPagesResponse {
  data: CmsPage[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 获取页面列表
export function useCmsPages(params?: CmsPageQueryParams) {
  const { cmsControllerFindAllPages } = getCms();

  return useQuery<CmsPagesResponse>({
    queryKey: ["cms-pages", params],
    queryFn: async () => {
      const result = await cmsControllerFindAllPages(params);
      return result as unknown as CmsPagesResponse;
    },
  });
}

// 获取单个页面
export function useCmsPage(id: string) {
  const { cmsControllerFindOnePage } = getCms();

  return useQuery<CmsPage>({
    queryKey: ["cms-page", id],
    queryFn: async () => {
      const result = await cmsControllerFindOnePage(id);
      return result as unknown as CmsPage;
    },
    enabled: !!id,
  });
}

// 导出类型供外部使用
export type { CmsPage, CmsPagesResponse, CmsPageQueryParams };

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
