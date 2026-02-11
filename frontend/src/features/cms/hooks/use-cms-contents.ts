/**
 * CMS 内容管理 Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type {
  CmsContentsResponse,
  CmsContentFormData,
  CmsContentQuery,
  CmsTag,
  ContentType,
} from "../types/cms";

/**
 * 获取内容列表
 */
export function useCmsContents(query: CmsContentQuery = {}) {
  return useQuery({
    queryKey: ["cms-contents", query],
    queryFn: () => getScrmApi().cmsControllerFindAllContents(query),
    select: (data) => {
      return data as unknown as CmsContentsResponse;
    },
  });
}

/**
 * 获取指定类型的内容
 */
export function useCmsContentsByType(
  contentType: ContentType,
  query: CmsContentQuery = {},
) {
  return useQuery({
    queryKey: ["cms-contents", contentType, query],
    queryFn: () => {
      switch (contentType) {
        case "ARTICLE":
          return getScrmApi().cmsControllerGetArticles(query);
        case "CASE_STUDY":
          return getScrmApi().cmsControllerGetCases(query);
        case "PRODUCT_SHOWCASE":
          return getScrmApi().cmsControllerGetProductShowcases(query);
        case "PROFILE":
          return getScrmApi().cmsControllerGetProfiles(query);
        case "PAGE_ELEMENT":
          return getScrmApi().cmsControllerFindAllContents({
            ...query,
            contentType: "PAGE_ELEMENT",
          });
      }
    },
    select: (data) => {
      return data as unknown as CmsContentsResponse;
    },
  });
}

/**
 * 获取内容详情
 */
export function useCmsContent(id: string) {
  return useQuery({
    queryKey: ["cms-content", id],
    queryFn: () => getScrmApi().cmsControllerFindOneContent(id),
    enabled: !!id,
  });
}

/**
 * 获取所有标签
 */
export function useCmsTags() {
  return useQuery<CmsTag[]>({
    queryKey: ["cms-tags"],
    queryFn: async () => {
      const result = await getScrmApi().cmsControllerFindAllTags();
      return result as unknown as CmsTag[];
    },
  });
}

/**
 * 创建内容
 */
export function useCreateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CmsContentFormData) =>
      getScrmApi().cmsControllerCreateContent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-contents"] });
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
export function useUpdateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CmsContentFormData>;
    }) => getScrmApi().cmsControllerUpdateContent(id, data as any),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cms-contents"] });
      queryClient.invalidateQueries({
        queryKey: ["cms-content", variables.id],
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
export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => getScrmApi().cmsControllerDeleteContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-contents"] });
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
export function usePublishContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => getScrmApi().cmsControllerPublishContent(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["cms-contents"] });
      queryClient.invalidateQueries({
        queryKey: ["cms-content", id],
      });
      toast.success("内容发布成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "内容发布失败");
    },
  });
}

/**
 * 取消发布内容
 */
export function useUnpublishContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => getScrmApi().cmsControllerUnpublishContent(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["cms-contents"] });
      queryClient.invalidateQueries({
        queryKey: ["cms-content", id],
      });
      toast.success("已取消发布");
    },
    onError: (error: Error) => {
      toast.error(error.message || "操作失败");
    },
  });
}

/**
 * 创建标签
 */
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      color?: string;
      sortOrder?: number;
    }) => getScrmApi().cmsControllerCreateTag(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-tags"] });
      toast.success("标签创建成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "标签创建失败");
    },
  });
}

/**
 * 更新标签
 */
export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CmsTag> }) =>
      getScrmApi().cmsControllerUpdateTag(id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-tags"] });
      toast.success("标签更新成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "标签更新失败");
    },
  });
}

/**
 * 删除标签
 */
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => getScrmApi().cmsControllerDeleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-tags"] });
      toast.success("标签删除成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "标签删除失败");
    },
  });
}
