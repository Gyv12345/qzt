/**
 * CMS 全屏内容编辑器
 * 沉浸式编辑体验，支持富文本编辑和实时预览
 */

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";
import { CmsEditorSidebar } from "./cms-editor-sidebar";
import { CmsEditorMain } from "./cms-editor-main";
import { CmsEditorToolbar } from "./cms-editor-toolbar";
import { useCreateContent, useUpdateContent } from "../hooks/use-cms-contents";
import { useAutoSave } from "../hooks/use-auto-save";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { useEditorShortcuts } from "../hooks/use-editor-shortcuts";
import type { CmsContent } from "../types/cms";

const cmsEditorSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  slug: z
    .string()
    .min(1, "Slug不能为空")
    .regex(/^[a-z0-9-]+$/, "Slug只能包含小写字母、数字和连字符"),
  content: z.string().min(1, "内容不能为空"),
  excerpt: z.string().optional(),
  coverImage: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  contentType: z.enum([
    "ARTICLE",
    "CASE_STUDY",
    "PRODUCT_SHOWCASE",
    "PROFILE",
    "PAGE_ELEMENT",
  ]),
  productId: z.string().optional(),
  userId: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
  keywords: z.string().optional(),
});

export type CmsEditorValues = z.infer<typeof cmsEditorSchema>;

// 支持的内容类型（排除 PAGE_ELEMENT）
type SupportedContentType =
  | "ARTICLE"
  | "CASE_STUDY"
  | "PRODUCT_SHOWCASE"
  | "PROFILE";

interface CmsContentEditorProps {
  mode: "new" | "edit";
  content?: CmsContent;
  onBack: () => void;
  onSuccess: () => void;
}

export function CmsContentEditor({
  mode,
  content,
  onBack,
  onSuccess,
}: CmsContentEditorProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isEdit = mode === "edit";

  // 表单初始化
  const form = useForm<CmsEditorValues>({
    resolver: zodResolver(cmsEditorSchema),
    defaultValues: content
      ? {
          title: content.title,
          slug: content.slug,
          content: content.content,
          excerpt: content.excerpt || "",
          coverImage: content.coverImage || "",
          status: content.status,
          // 过滤掉 PAGE_ELEMENT 类型
          contentType:
            content.contentType === "PAGE_ELEMENT"
              ? "ARTICLE"
              : (content.contentType as SupportedContentType),
          productId: content.productId || "",
          userId: content.userId || "",
          metaTitle: content.metaTitle || "",
          metaDesc: content.metaDesc || "",
          keywords: content.keywords || "",
        }
      : {
          title: "",
          slug: "",
          content: "",
          excerpt: "",
          coverImage: "",
          status: "DRAFT",
          contentType: "ARTICLE",
          productId: "",
          userId: "",
          metaTitle: "",
          metaDesc: "",
          keywords: "",
        },
  });

  const createMutation = useCreateContent();
  const updateMutation = useUpdateContent();

  const isDirty = form.formState.isDirty;
  const currentStatus = form.watch("status");

  // 自动保存
  const autoSave = useCallback(async () => {
    if (!isDirty || isSaving) return;

    const values = form.getValues();
    if (!values.title || !values.content) return;

    setIsSaving(true);
    try {
      if (isEdit && content) {
        await updateMutation.mutateAsync({
          id: content.id,
          data: values,
        });
      } else {
        // 新建时暂不自动保存，因为需要 ID
        // 可以保存到 localStorage
      }
    } catch (error) {
      console.error("自动保存失败:", error);
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, isSaving, form, isEdit, content, updateMutation]);

  useAutoSave({ autoSave, delay: 3000 });
  useUnsavedChanges({ isDirty });
  useEditorShortcuts({
    onSave: handleSave,
    onPublish: handlePublish,
    onPreview: () => setShowPreview(!showPreview),
    onBack,
  });

  // 保存草稿
  async function handleSave() {
    const values = form.getValues();
    const isValid = await form.trigger();

    if (!isValid) {
      toast.error("请检查表单填写是否正确");
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && content) {
        await updateMutation.mutateAsync({
          id: content.id,
          data: { ...values, status: "DRAFT" },
        });
      } else {
        await createMutation.mutateAsync({
          ...values,
          status: "DRAFT",
        } as any);
      }
      onSuccess();
    } catch (error) {
      console.error("保存失败:", error);
    } finally {
      setIsSaving(false);
    }
  }

  // 发布内容
  async function handlePublish() {
    const values = form.getValues();
    const isValid = await form.trigger();

    if (!isValid) {
      toast.error("请检查表单填写是否正确");
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && content) {
        await updateMutation.mutateAsync({
          id: content.id,
          data: { ...values, status: "PUBLISHED" },
        });
      } else {
        await createMutation.mutateAsync({
          ...values,
          status: "PUBLISHED",
        } as any);
      }
      onSuccess();
    } catch (error) {
      console.error("发布失败:", error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <div className="flex h-screen flex-col overflow-hidden">
        {/* 顶部工具栏 */}
        <CmsEditorToolbar
          isNew={!isEdit}
          isDirty={isDirty}
          isSaving={isSaving}
          status={currentStatus}
          onBack={onBack}
          onSave={handleSave}
          onPublish={handlePublish}
          onPreview={() => setShowPreview(!showPreview)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        {/* 主编辑区 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧边栏 */}
          {sidebarOpen && (
            <aside
              className={cn(
                "w-80 border-r bg-card transition-all duration-300",
                "flex flex-col overflow-hidden",
              )}
            >
              <CmsEditorSidebar form={form as any} />
            </aside>
          )}

          {/* 主编辑区域 */}
          <main className="flex-1 overflow-hidden">
            <CmsEditorMain form={form as any} showPreview={showPreview} />
          </main>
        </div>
      </div>
    </Form>
  );
}
