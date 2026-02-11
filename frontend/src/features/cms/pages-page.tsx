/**
 * CMS 页面管理
 */

import { useCallback } from "react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { CmsPagesTable } from "./components/cms-pages-table";
import {
  useCmsPages,
  useDeletePage,
  usePublishPage,
  useUnpublishPage,
} from "./hooks/use-cms-pages";
import { toast } from "sonner";

export function CmsPagesPage() {
  const navigate = useNavigate();

  // 获取页面列表
  const { data, isLoading, refetch } = useCmsPages({ page: 1, pageSize: 100 });

  // Mutations
  const deletePage = useDeletePage();
  const publishPage = usePublishPage();
  const unpublishPage = useUnpublishPage();

  // 跳转到新建页面
  const handleCreate = useCallback(() => {
    navigate({ to: "/cms/pages/new" });
  }, [navigate]);

  // 跳转到编辑页面
  const handleEdit = useCallback(
    (page: any) => {
      navigate({ to: "/cms/pages/edit/$pageId", params: { pageId: page.id } });
    },
    [navigate],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deletePage.mutate(id, {
        onSuccess: () => {
          toast.success("删除成功");
          refetch();
        },
        onError: (error: any) => {
          console.error("删除页面失败:", error);
          const message =
            error.response?.data?.message || error.message || "删除失败";
          toast.error(`删除失败: ${message}`);
        },
      });
    },
    [deletePage, refetch],
  );

  const handlePublish = useCallback(
    (id: string) => {
      publishPage.mutate(id, {
        onSuccess: () => {
          toast.success("发布成功");
          refetch();
        },
        onError: (error: any) => {
          console.error("发布页面失败:", error);
          const message =
            error.response?.data?.message || error.message || "发布失败";
          toast.error(`发布失败: ${message}`);
        },
      });
    },
    [publishPage, refetch],
  );

  const handleUnpublish = useCallback(
    (id: string) => {
      unpublishPage.mutate(id, {
        onSuccess: () => {
          toast.success("已取消发布");
          refetch();
        },
        onError: (error: any) => {
          console.error("取消发布失败:", error);
          const message =
            error.response?.data?.message || error.message || "操作失败";
          toast.error(`操作失败: ${message}`);
        },
      });
    },
    [unpublishPage, refetch],
  );

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">页面管理</h2>
          <p className="text-muted-foreground">管理 Website 首页等可配置页面</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新建页面
        </Button>
      </div>

      {/* 页面表格 */}
      <CmsPagesTable
        data={data?.data ?? []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
      />
    </Main>
  );
}
