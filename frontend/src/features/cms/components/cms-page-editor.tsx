/**
 * CMS 全屏页面编辑器
 * 沉浸式编辑体验，支持页面元素编辑和实时预览
 * 架构参考 cms-content-editor.tsx
 */

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CmsEditorToolbar } from "./cms-editor-toolbar";
import { CmsPageEditorSidebar } from "./cms-page-editor-sidebar";
import { CmsPageEditorMain } from "./cms-page-editor-main";
import { useCreatePage, useUpdatePage } from "../hooks/use-cms-pages";
import { useAutoSave } from "../hooks/use-auto-save";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { useEditorShortcuts } from "../hooks/use-editor-shortcuts";

// 页面元素 schema
const pageElementSchema = z.object({
  sectionType: z.enum([
    "HERO",
    "STATS",
    "FEATURES",
    "CTA",
    "TESTIMONIALS",
    "PARTNERS",
    "CONTACT",
  ]),
  elementType: z.enum([
    "heading",
    "text",
    "button",
    "image",
    "card",
    "list",
    "statistic",
    "testimonial",
  ]),
  sortOrder: z.number().int().min(0).default(0),
  content: z.string().optional(),
  visible: z.boolean().default(true),
});

// 页面 schema
const cmsPageEditorSchema = z.object({
  name: z.string().min(1, "页面名称不能为空").max(100),
  title: z.string().min(1, "页面标题不能为空").max(200),
  slug: z
    .string()
    .min(1, "URL路径不能为空")
    .regex(/^[a-z0-9-]+$/, "Slug只能包含小写字母、数字和连字符"),
  description: z.string().max(500).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  elements: z.array(pageElementSchema).optional(),
});

export type CmsPageEditorValues = z.infer<typeof cmsPageEditorSchema>;
export type PageElementData = z.infer<typeof pageElementSchema>;

// CmsPage 类型（从 API 返回的数据）
interface CmsPage {
  id: string;
  name: string;
  title: string;
  slug: string;
  description?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  elements?: PageElementData[];
  createdAt: string;
  updatedAt: string;
}

interface CmsPageEditorProps {
  mode: "new" | "edit";
  page?: CmsPage;
  onBack: () => void;
  onSuccess: () => void;
}

export function CmsPageEditor({
  mode,
  page,
  onBack,
  onSuccess,
}: CmsPageEditorProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isEdit = mode === "edit";

  // 表单初始化
  const form = useForm<CmsPageEditorValues>({
    resolver: zodResolver(cmsPageEditorSchema) as Resolver<CmsPageEditorValues>,
    defaultValues: page
      ? {
          name: page.name,
          title: page.title,
          slug: page.slug,
          description: page.description || "",
          status: page.status,
          elements: page.elements || [],
        }
      : {
          name: "",
          title: "",
          slug: "",
          description: "",
          status: "DRAFT" as const,
          elements: [],
        },
  });

  const createMutation = useCreatePage();
  const updateMutation = useUpdatePage();

  const isDirty = form.formState.isDirty;
  const currentStatus = form.watch("status");

  // 自动保存
  const autoSave = useCallback(async () => {
    if (!isDirty || isSaving) return;

    const values = form.getValues();
    if (!values.name || !values.title) return;

    setIsSaving(true);
    try {
      if (isEdit && page) {
        await updateMutation.mutateAsync({
          id: page.id,
          data: values,
        });
      }
      // 新建时暂不自动保存，因为需要 ID
    } catch (error) {
      console.error("自动保存失败:", error);
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, isSaving, form, isEdit, page, updateMutation]);

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
      if (isEdit && page) {
        await updateMutation.mutateAsync({
          id: page.id,
          data: { ...values, status: "DRAFT" },
        });
      } else {
        await createMutation.mutateAsync({
          ...values,
          status: "DRAFT",
        } as any);
      }
      onSuccess();
    } catch (error: any) {
      console.error("保存失败:", error);
      const message =
        error.response?.data?.message || error.message || "保存失败";
      toast.error(`保存失败: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }

  // 发布页面
  async function handlePublish() {
    const values = form.getValues();
    const isValid = await form.trigger();

    if (!isValid) {
      toast.error("请检查表单填写是否正确");
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && page) {
        await updateMutation.mutateAsync({
          id: page.id,
          data: { ...values, status: "PUBLISHED" },
        });
      } else {
        await createMutation.mutateAsync({
          ...values,
          status: "PUBLISHED",
        } as any);
      }
      onSuccess();
    } catch (error: any) {
      console.error("发布失败:", error);
      const message =
        error.response?.data?.message || error.message || "发布失败";
      toast.error(`发布失败: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
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
            <CmsPageEditorSidebar form={form as any} />
          </aside>
        )}

        {/* 主编辑区域 */}
        <main className="flex-1 overflow-hidden">
          <CmsPageEditorMain form={form as any} showPreview={showPreview} />
        </main>
      </div>
    </div>
  );
}
