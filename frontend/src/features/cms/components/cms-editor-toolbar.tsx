/**
 * CMS 编辑器顶部工具栏
 * 提供保存、发布、预览等操作
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Eye, Rocket, Settings2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentStatus } from "../types/cms";
import { CONTENT_STATUS_CONFIG } from "../types/cms";

interface CmsEditorToolbarProps {
  isNew: boolean;
  isDirty: boolean;
  isSaving: boolean;
  status: ContentStatus;
  onBack: () => void;
  onSave: () => void;
  onPublish: () => void;
  onPreview: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function CmsEditorToolbar({
  isNew,
  isDirty,
  isSaving,
  status,
  onBack,
  onSave,
  onPublish,
  onPreview,
  onToggleSidebar,
  sidebarOpen,
}: CmsEditorToolbarProps) {
  // 保存状态指示
  const getSaveStatus = () => {
    if (isSaving) return { text: "保存中...", showSpinner: true };
    if (isDirty) return { text: "有未保存更改", showSpinner: false };
    return { text: "已保存", showSpinner: false };
  };

  const saveStatus = getSaveStatus();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 transition-all">
      {/* 左侧：返回和标题 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex flex-col">
          <h1 className="text-sm font-medium">
            {isNew ? "新建内容" : "编辑内容"}
          </h1>
          <div className="flex items-center gap-2">
            {saveStatus.showSpinner ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : null}
            <span
              className={cn(
                "text-xs",
                isDirty ? "text-orange-500" : "text-muted-foreground",
              )}
            >
              {saveStatus.text}
            </span>
          </div>
        </div>
      </div>

      {/* 中间：状态显示 */}
      <div className="flex items-center gap-2">
        <Badge
          variant={
            status === "PUBLISHED"
              ? "default"
              : status === "DRAFT"
                ? "secondary"
                : "outline"
          }
        >
          {CONTENT_STATUS_CONFIG[status].label}
        </Badge>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 侧边栏切换 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className={cn(
            "transition-colors",
            sidebarOpen && "bg-accent text-accent-foreground",
          )}
          title={sidebarOpen ? "隐藏设置" : "显示设置"}
        >
          <Settings2 className="h-5 w-5" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* 预览 */}
        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye className="mr-2 h-4 w-4" />
          预览
        </Button>

        {/* 保存草稿 */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving || !isDirty}
        >
          <Save className="mr-2 h-4 w-4" />
          保存草稿
        </Button>

        {/* 发布 */}
        <Button
          size="sm"
          onClick={onPublish}
          disabled={isSaving}
          className="min-w-[100px]"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="mr-2 h-4 w-4" />
          )}
          {status === "PUBLISHED" ? "更新发布" : "发布"}
        </Button>
      </div>
    </header>
  );
}
