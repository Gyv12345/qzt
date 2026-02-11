/**
 * 页面元素表单抽屉
 */

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateContent, useUpdateContent } from "../hooks/use-cms-contents";
import type { CmsContent } from "../types/cms";

// Hero 内容配置的 Schema
const heroContentSchema = z.object({
  badge: z.string().optional(),
  title: z.string().min(1, "标题不能为空"),
  subtitle: z.string().min(1, "副标题不能为空"),
  description: z.string().min(1, "描述不能为空"),
  ctaPrimaryText: z.string().optional(),
  ctaPrimaryUrl: z.string().optional(),
  ctaSecondaryText: z.string().optional(),
  ctaSecondaryUrl: z.string().optional(),
});

type HeroContentForm = z.infer<typeof heroContentSchema>;

// 表单验证 Schema
const formSchema = z.object({
  title: z.string().min(1, "名称不能为空"),
  slug: z.string().min(1, "标识不能为空"),
  content: z.string().min(1, "内容不能为空"),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ElementsFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element?: CmsContent | null;
  onSuccess?: () => void;
  templates?: Array<{
    slug: string;
    title: string;
    description: string;
    defaultContent: string;
  }>;
}

export function ElementsFormDrawer({
  open,
  onOpenChange,
  element,
  onSuccess,
  templates = [],
}: ElementsFormDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createMutation = useCreateContent();
  const updateMutation = useUpdateContent();

  const isEdit = !!element;

  // 尝试解析 content 为 JSON
  const parseContent = (content: string): HeroContentForm | null => {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  };

  // 初始化表单
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: element?.title || "",
      slug: element?.slug || "",
      content: element?.content || "",
      status: (element?.status === "DRAFT" || element?.status === "PUBLISHED"
        ? element.status
        : "DRAFT") as "DRAFT" | "PUBLISHED",
    },
  });

  // 当编辑对象变化时，更新表单
  useEffect(() => {
    if (element) {
      form.reset({
        title: element.title,
        slug: element.slug,
        content: element.content,
        status: (element.status === "DRAFT" || element.status === "PUBLISHED"
          ? element.status
          : "DRAFT") as "DRAFT" | "PUBLISHED",
      });
    } else {
      form.reset({
        title: "",
        slug: "",
        content: "",
        status: "DRAFT",
      });
    }
  }, [element, form]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      // 验证 JSON 格式
      try {
        JSON.parse(values.content);
      } catch {
        toast.error("内容必须是有效的 JSON 格式");
        return;
      }

      setIsSubmitting(true);
      try {
        if (isEdit && element) {
          await updateMutation.mutateAsync({
            id: element.id,
            data: {
              ...values,
              contentType: "PAGE_ELEMENT",
            },
          });
        } else {
          await createMutation.mutateAsync({
            ...values,
            contentType: "PAGE_ELEMENT",
          });
        }
        onSuccess?.();
        onOpenChange(false);
        form.reset();
      } catch (error) {
        // 错误已在 mutation 中处理
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isEdit,
      element,
      updateMutation,
      createMutation,
      onSuccess,
      onOpenChange,
      form,
    ],
  );

  // 使用模板填充
  const handleUseTemplate = useCallback(
    (template: (typeof templates)[number]) => {
      form.setValue("title", template.title);
      form.setValue("slug", template.slug);
      form.setValue("content", template.defaultContent);
    },
    [form],
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader className="px-6">
            <DrawerTitle>
              {isEdit ? "编辑页面元素" : "新建页面元素"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-6 pb-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
              >
                {/* 基本信息 */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>名称</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="如：首页 Hero 区域" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>标识（slug）</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="如：homepage-hero"
                            disabled={isEdit}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 模板快捷填充 */}
                {!isEdit && templates.length > 0 && (
                  <div>
                    <FormLabel>快速填充模板</FormLabel>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {templates.map((template) => (
                        <Badge
                          key={template.slug}
                          variant="outline"
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => handleUseTemplate(template)}
                        >
                          {template.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* JSON 内容编辑器 */}
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>内容配置（JSON）</FormLabel>
                        {parseContent(field.value) && (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            JSON 格式正确
                          </Badge>
                        )}
                      </div>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={15}
                          className="font-mono text-sm"
                          placeholder={`{
  "badge": "徽章文字",
  "title": "主标题",
  "subtitle": "副标题",
  "description": "描述文字",
  "ctaPrimaryText": "主按钮文字",
  "ctaPrimaryUrl": "#contact",
  "ctaSecondaryText": "次按钮文字",
  "ctaSecondaryUrl": "/demo"
}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* JSON 格式提示 */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm text-blue-800">
                    <strong>JSON 格式说明：</strong>内容必须是有效的 JSON
                    格式。对于首页 Hero 区域，支持的字段包括：
                    badge、title、subtitle、description、ctaPrimaryText、ctaPrimaryUrl、ctaSecondaryText、ctaSecondaryUrl。
                  </p>
                </div>

                {/* 提交按钮 */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>{isEdit ? "保存更改" : "创建元素"}</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
