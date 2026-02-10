/**
 * CMS 内容预览组件
 * 显示内容的最终效果
 */

import { UseFormReturn } from "react-hook-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CONTENT_STATUS_CONFIG } from "../types/cms";
import type { CmsEditorValues } from "./cms-content-editor";

interface CmsEditorPreviewProps {
  form: UseFormReturn<CmsEditorValues>;
}

export function CmsEditorPreview({ form }: CmsEditorPreviewProps) {
  const title = form.watch("title") || "无标题";
  const content = form.watch("content") || "";
  const excerpt = form.watch("excerpt");
  const coverImage = form.watch("coverImage");
  const status = form.watch("status");
  const contentType = form.watch("contentType");
  const metaTitle = form.watch("metaTitle");
  const metaDesc = form.watch("metaDesc");

  // 获取内容类型标签
  const getContentTypeLabel = () => {
    const labels: Record<string, string> = {
      ARTICLE: "文章",
      CASE_STUDY: "案例",
      PRODUCT_SHOWCASE: "产品展示",
      PROFILE: "人员介绍",
    };
    return labels[contentType] || contentType;
  };

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl px-8 py-8">
        {/* 预览标识 */}
        <div className="mb-6 flex items-center justify-between">
          <Badge variant="outline">预览模式</Badge>
          <div className="flex gap-2">
            <Badge>{getContentTypeLabel()}</Badge>
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
        </div>

        {/* 封面图 */}
        {coverImage && (
          <div className="mb-8 overflow-hidden rounded-lg">
            <img src={coverImage} alt={title} className="w-full object-cover" />
          </div>
        )}

        {/* 标题 */}
        <h1 className="mb-4 text-4xl font-bold">{title}</h1>

        {/* 摘要 */}
        {excerpt && (
          <p className="mb-6 text-lg text-muted-foreground">{excerpt}</p>
        )}

        <hr className="my-8 border-border" />

        {/* 内容 */}
        <div
          className="prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* SEO 信息预览 */}
        {(metaTitle || metaDesc) && (
          <>
            <hr className="my-8 border-border" />
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                SEO 预览
              </h3>
              {metaTitle && (
                <p className="text-lg font-medium text-blue-600 hover:underline">
                  {metaTitle}
                </p>
              )}
              {metaDesc && <p className="text-sm text-green-700">{metaDesc}</p>}
              <p className="text-xs text-green-900">
                https://example.com/{form.watch("slug")}
              </p>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
