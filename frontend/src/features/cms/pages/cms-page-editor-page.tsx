/**
 * CMS 页面全屏编辑器页面
 * 提供沉浸式页面编辑体验
 */

import { useNavigate } from "@tanstack/react-router";
import { CmsPageEditor } from "@/features/cms/components";
import { useCmsPage, type CmsPage } from "../hooks/use-cms-pages";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface CmsPageEditorPageProps {
  mode: "new" | "edit";
  pageId?: string;
}

export function CmsPageEditorPage({ mode, pageId }: CmsPageEditorPageProps) {
  const navigate = useNavigate();
  const { data: page, isLoading, error } = useCmsPage(pageId || "");

  // 处理返回
  const handleBack = () => {
    navigate({ to: "/cms/pages" });
  };

  // 处理保存成功
  const handleSuccess = () => {
    toast.success(mode === "new" ? "页面创建成功" : "页面更新成功");
    navigate({ to: "/cms/pages" });
  };

  // 编辑模式下加载数据
  if (mode === "edit") {
    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="space-y-4 text-center">
            <Skeleton className="mx-auto h-8 w-8 rounded-full" />
            <p className="text-muted-foreground">加载页面中...</p>
          </div>
        </div>
      );
    }

    if (error || !page) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-destructive">加载失败</p>
            <p className="text-sm text-muted-foreground">
              {error?.message || "页面不存在"}
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <CmsPageEditor
        mode={mode}
        page={page as CmsPage | undefined}
        onBack={handleBack}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
