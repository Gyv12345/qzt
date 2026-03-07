/**
 * CMS 编辑器主编辑区
 * 包含标题输入和富文本内容编辑器
 */

import { useState, useCallback, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CmsEditorTitle } from "./cms-editor-title";
import { CmsEditorContent } from "./cms-editor-content";
import { CmsEditorPreview } from "./cms-editor-preview";
import type { CmsEditorValues } from "./cms-content-editor";

interface CmsEditorMainProps {
  form: UseFormReturn<CmsEditorValues>;
  showPreview: boolean;
  onPreviewChange: (show: boolean) => void;
}

export function CmsEditorMain({
  form,
  showPreview,
}: Omit<CmsEditorMainProps, "onPreviewChange">) {
  const [wordCount, setWordCount] = useState(0);

  const content = form.watch("content") || "";

  // 计算字数
  const calculateWordCount = useCallback((text: string) => {
    // 移除 HTML 标签计算纯文本字数
    const plainText = text.replace(/<[^>]*>/g, "");
    return plainText.length;
  }, []);

  const handleContentChange = useCallback(
    (newContent: string) => {
      form.setValue("content", newContent);
      setWordCount(calculateWordCount(newContent));
    },
    [form, calculateWordCount],
  );

  // 初始化字数
  useEffect(() => {
    setWordCount(calculateWordCount(content));
  }, [content, calculateWordCount]);

  return (
    <div className="flex h-full flex-col">
      {showPreview ? (
        // 预览模式
        <CmsEditorPreview form={form} />
      ) : (
        // 编辑模式
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-4xl px-8 py-8">
            {/* 标题输入 */}
            <CmsEditorTitle form={form} />

            {/* 富文本编辑器 */}
            <div className="mt-6">
              <CmsEditorContent
                content={content}
                onChange={handleContentChange}
              />
            </div>

            {/* 字数统计 */}
            <div className="mt-4 flex justify-end">
              <span className="text-sm text-muted-foreground">
                {wordCount} 字
              </span>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
