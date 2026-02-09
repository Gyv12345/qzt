/**
 * CMS 页面管理
 */

import { useState, useCallback } from "react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CmsPagesTable } from "./components/cms-pages-table";
import { CmsPageFormDrawer } from "./components/cms-page-form-drawer";
import { PagePreviewDialog } from "./components/page-preview-dialog";
import {
  useCmsPages,
  useCreatePage,
  useUpdatePage,
  useDeletePage,
  usePublishPage,
  useUnpublishPage,
} from "./hooks/use-cms-pages";
import { toast } from "sonner";
import type { CmsPageFormData } from "./components/cms-page-form-drawer";

export function CmsPagesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any | null>(null);
  const [previewPage, setPreviewPage] = useState<any | null>(null);

  // 获取页面列表
  const { data, isLoading } = useCmsPages({ page: 1, pageSize: 100 });

  // Mutations
  const createPage = useCreatePage();
  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();
  const publishPage = usePublishPage();
  const unpublishPage = useUnpublishPage();

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingPage(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((page: any) => {
    setEditingPage(page);
    setDrawerOpen(true);
  }, []);

  const handlePreview = useCallback((page: any) => {
    setPreviewPage(page);
    setPreviewOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deletePage.mutate(id, {
        onSuccess: () => {
          toast.success("删除成功");
          handleRefresh();
        },
        onError: () => {
          toast.error("删除失败");
        },
      });
    },
    [deletePage, handleRefresh],
  );

  const handlePublish = useCallback(
    (id: string) => {
      publishPage.mutate(id, {
        onSuccess: () => {
          toast.success("发布成功");
          handleRefresh();
        },
        onError: () => {
          toast.error("发布失败");
        },
      });
    },
    [publishPage, handleRefresh],
  );

  const handleUnpublish = useCallback(
    (id: string) => {
      unpublishPage.mutate(id, {
        onSuccess: () => {
          toast.success("已取消发布");
          handleRefresh();
        },
        onError: () => {
          toast.error("操作失败");
        },
      });
    },
    [unpublishPage, handleRefresh],
  );

  const handleSubmit = useCallback(
    (formData: CmsPageFormData) => {
      if (editingPage) {
        updatePage.mutate(
          { id: editingPage.id, data: formData },
          {
            onSuccess: () => {
              toast.success("更新成功");
              setDrawerOpen(false);
              handleRefresh();
            },
            onError: () => {
              toast.error("更新失败");
            },
          },
        );
      } else {
        createPage.mutate(formData, {
          onSuccess: () => {
            toast.success("创建成功");
            setDrawerOpen(false);
            handleRefresh();
          },
          onError: () => {
            toast.error("创建失败");
          },
        });
      }
    },
    [editingPage, createPage, updatePage, handleRefresh],
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
        key={refreshKey}
        data={data?.data || []}
        total={data?.total || 0}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onPreview={handlePreview}
      />

      {/* 表单抽屉 */}
      <CmsPageFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSubmit={handleSubmit}
        initialData={editingPage || undefined}
        isSubmitting={createPage.isPending || updatePage.isPending}
        title={editingPage ? "编辑页面" : "新建页面"}
      />

      {/* 预览对话框 */}
      <PagePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        page={previewPage}
      />
    </Main>
  );
}
