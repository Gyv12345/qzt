/**
 * CMS 全屏编辑器页面
 * 提供沉浸式内容编辑体验
 */

import { useNavigate } from "@tanstack/react-router";
import { CmsContentEditor } from "../components/cms-content-editor";
import { useCmsContent } from "../hooks/use-cms-contents";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface CmsEditorPageProps {
  mode: "new" | "edit";
  contentId?: string;
}

export function CmsEditorPage({ mode, contentId }: CmsEditorPageProps) {
  const navigate = useNavigate();
  const { data: content, isLoading, error } = useCmsContent(contentId || "");

  // 处理返回
  const handleBack = () => {
    navigate({ to: "/cms" });
  };

  // 处理保存成功
  const handleSuccess = () => {
    toast.success(mode === "new" ? "内容创建成功" : "内容更新成功");
    navigate({ to: "/cms" });
  };

  // 编辑模式下加载数据
  if (mode === "edit") {
    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="space-y-4 text-center">
            <Skeleton className="mx-auto h-8 w-8 rounded-full" />
            <p className="text-muted-foreground">加载内容中...</p>
          </div>
        </div>
      );
    }

    if (error || !content) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-destructive">加载失败</p>
            <p className="text-sm text-muted-foreground">
              {error?.message || "内容不存在"}
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <CmsContentEditor
        mode={mode}
        content={content || undefined}
        onBack={handleBack}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
