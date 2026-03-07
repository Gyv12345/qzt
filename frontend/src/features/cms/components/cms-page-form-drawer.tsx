/**
 * CMS 页面表单抽屉
 */

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
const cmsPageSchema = z.object({
  name: z.string().min(1, "页面名称不能为空").max(100),
  title: z.string().min(1, "页面标题不能为空").max(200),
  slug: z.string().min(1, "URL路径不能为空"),
  description: z.string().max(500).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  elements: z.array(pageElementSchema).optional(),
});

export type CmsPageFormData = z.infer<typeof cmsPageSchema>;
export type PageElementData = z.infer<typeof pageElementSchema>;

interface CmsPageFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CmsPageFormData) => void;
  initialData?: Partial<CmsPageFormData>;
  isSubmitting?: boolean;
  title?: string;
}

// 区域类型显示名称
const sectionTypeLabels: Record<string, string> = {
  HERO: "首屏区域",
  STATS: "数据统计",
  FEATURES: "功能特点",
  CTA: "行动号召",
  TESTIMONIALS: "用户评价",
  PARTNERS: "合作伙伴",
  CONTACT: "联系方式",
};

// 元素类型显示名称
const elementTypeLabels: Record<string, string> = {
  heading: "标题",
  text: "文本",
  button: "按钮",
  image: "图片",
  card: "卡片",
  list: "列表",
  statistic: "统计数字",
  testimonial: "评价",
};

// 元素内容编辑器组件
function ElementContentEditor({
  element,
  onChange,
}: {
  element: PageElementData;
  onChange: (content: string) => void;
}) {
  // 尝试解析 JSON
  let contentData: Record<string, any> = {};
  try {
    contentData = element.content ? JSON.parse(element.content) : {};
  } catch {
    contentData = {};
  }

  const updateContent = (updates: Record<string, any>) => {
    const newData = { ...contentData, ...updates };
    onChange(JSON.stringify(newData));
  };

  // 根据元素类型渲染不同的表单字段
  switch (element.elementType) {
    case "heading":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">标题文字</label>
            <Input
              value={contentData.text || ""}
              onChange={(e) => updateContent({ text: e.target.value })}
              placeholder="请输入标题"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              副标题（可选）
            </label>
            <Input
              value={contentData.subtitle || ""}
              onChange={(e) => updateContent({ subtitle: e.target.value })}
              placeholder="请输入副标题"
            />
          </div>
        </div>
      );

    case "text":
      return (
        <div>
          <label className="text-xs text-muted-foreground">文本内容</label>
          <Textarea
            value={contentData.text || ""}
            onChange={(e) => updateContent({ text: e.target.value })}
            placeholder="请输入文本内容"
            rows={3}
            className="resize-none"
          />
        </div>
      );

    case "button":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">按钮文字</label>
            <Input
              value={contentData.text || ""}
              onChange={(e) => updateContent({ text: e.target.value })}
              placeholder="按钮文字"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">链接地址</label>
            <Input
              value={contentData.url || ""}
              onChange={(e) => updateContent({ url: e.target.value })}
              placeholder="/page 或 https://..."
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`isPrimary-${element.sortOrder}`}
              checked={contentData.isPrimary !== false}
              onChange={(e) => updateContent({ isPrimary: e.target.checked })}
              className="rounded"
            />
            <label
              htmlFor={`isPrimary-${element.sortOrder}`}
              className="text-sm"
            >
              主要按钮样式
            </label>
          </div>
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">图片 URL</label>
            <Input
              value={contentData.url || ""}
              onChange={(e) => updateContent({ url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">替代文字</label>
            <Input
              value={contentData.alt || ""}
              onChange={(e) => updateContent({ alt: e.target.value })}
              placeholder="图片描述"
            />
          </div>
        </div>
      );

    case "card":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">卡片标题</label>
            <Input
              value={contentData.title || ""}
              onChange={(e) => updateContent({ title: e.target.value })}
              placeholder="卡片标题"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">卡片描述</label>
            <Textarea
              value={contentData.description || ""}
              onChange={(e) => updateContent({ description: e.target.value })}
              placeholder="卡片描述"
              rows={2}
              className="resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              图标/渐变色（可选）
            </label>
            <Input
              value={contentData.gradient || ""}
              onChange={(e) => updateContent({ gradient: e.target.value })}
              placeholder="from-blue-400 to-cyan-500"
            />
          </div>
        </div>
      );

    case "statistic":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">标签</label>
            <Input
              value={contentData.label || ""}
              onChange={(e) => updateContent({ label: e.target.value })}
              placeholder="如：服务企业"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">数值</label>
            <Input
              type="number"
              value={contentData.value || ""}
              onChange={(e) =>
                updateContent({ value: parseInt(e.target.value) || 0 })
              }
              placeholder="10000"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              后缀（可选）
            </label>
            <Input
              value={contentData.suffix || ""}
              onChange={(e) => updateContent({ suffix: e.target.value })}
              placeholder="+ 或 %"
              className="w-20"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              渐变色（可选）
            </label>
            <Input
              value={contentData.color || ""}
              onChange={(e) => updateContent({ color: e.target.value })}
              placeholder="from-blue-500 to-cyan-500"
            />
          </div>
        </div>
      );

    case "testimonial":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">客户名称</label>
            <Input
              value={contentData.name || ""}
              onChange={(e) => updateContent({ name: e.target.value })}
              placeholder="客户姓名"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">客户职位</label>
            <Input
              value={contentData.role || ""}
              onChange={(e) => updateContent({ role: e.target.value })}
              placeholder="CEO / 公司名"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">评价内容</label>
            <Textarea
              value={contentData.content || ""}
              onChange={(e) => updateContent({ content: e.target.value })}
              placeholder="客户评价"
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
      );

    case "list":
      return (
        <div>
          <label className="text-xs text-muted-foreground">
            列表项（每行一项）
          </label>
          <Textarea
            value={contentData.items?.join("\n") || ""}
            onChange={(e) =>
              updateContent({
                items: e.target.value.split("\n").filter(Boolean),
              })
            }
            placeholder="第一项&#10;第二项&#10;第三项"
            rows={5}
            className="resize-none"
          />
        </div>
      );

    default:
      return (
        <div>
          <label className="text-xs text-muted-foreground">
            JSON 内容（高级）
          </label>
          <Textarea
            value={element.content || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder='{"key": "value"}'
            className="font-mono text-xs"
            rows={4}
          />
        </div>
      );
  }
}

export function CmsPageFormDrawer({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting = false,
  title = "页面配置",
}: CmsPageFormDrawerProps) {
  const [elements, setElements] = useState<PageElementData[]>(
    initialData?.elements || [],
  );

  const form = useForm<CmsPageFormData>({
    resolver: zodResolver(cmsPageSchema),
    defaultValues: {
      name: initialData?.name || "",
      title: initialData?.title || "",
      slug: initialData?.slug || "",
      description: initialData?.description || "",
      status: initialData?.status || "DRAFT",
      elements: initialData?.elements || [],
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
      setElements(initialData.elements || []);
    }
  }, [initialData, form]);

  const handleSubmit = (data: CmsPageFormData) => {
    onSubmit({ ...data, elements });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmitAny = (data: any) => {
    handleSubmit(data as CmsPageFormData);
  };

  // 添加元素
  const addElement = () => {
    const newElement: PageElementData = {
      sectionType: "HERO",
      elementType: "heading",
      sortOrder: elements.length,
      content: JSON.stringify({ text: "" }),
      visible: true,
    };
    setElements([...elements, newElement]);
  };

  // 更新元素
  const updateElement = (
    index: number,
    field: keyof PageElementData,
    value: any,
  ) => {
    const newElements = [...elements];
    newElements[index] = { ...newElements[index], [field]: value };
    setElements(newElements);
  };

  // 删除元素
  const removeElement = (index: number) => {
    setElements(elements.filter((_, i) => i !== index));
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <div className="mx-auto w-full max-w-2xl flex flex-col flex-1 overflow-hidden">
          <DrawerHeader className="px-6 flex-shrink-0">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>

          {/* 可滚动内容区域 */}
          <div className="px-6 flex-1 overflow-y-auto">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmitAny)}
                className="space-y-6"
              >
                {/* 基本信息 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">基本信息</h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control as any}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>页面名称</FormLabel>
                          <FormControl>
                            <Input placeholder="homepage" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL路径</FormLabel>
                          <FormControl>
                            <Input placeholder="homepage" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control as any}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>页面标题</FormLabel>
                        <FormControl>
                          <Input placeholder="首页" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>页面描述</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="页面描述..."
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>状态</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择状态" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DRAFT">草稿</SelectItem>
                            <SelectItem value="PUBLISHED">已发布</SelectItem>
                            <SelectItem value="ARCHIVED">已归档</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 页面元素 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">页面元素</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addElement}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      添加元素
                    </Button>
                  </div>

                  {elements.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 rounded-lg border border-dashed">
                      暂无元素，点击上方按钮添加
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {elements.map((element, index) => (
                        <div
                          key={index}
                          className="border rounded-lg p-4 space-y-4 bg-card"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                            <Badge variant="outline" className="text-xs">
                              {sectionTypeLabels[element.sectionType]}
                            </Badge>
                            <span className="text-sm font-medium flex-1">
                              {elementTypeLabels[element.elementType]}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeElement(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground">
                                区域类型
                              </label>
                              <Select
                                value={element.sectionType}
                                onValueChange={(value) =>
                                  updateElement(index, "sectionType", value)
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(sectionTypeLabels).map(
                                    ([value, label]) => (
                                      <SelectItem key={value} value={value}>
                                        {label}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-xs text-muted-foreground">
                                元素类型
                              </label>
                              <Select
                                value={element.elementType}
                                onValueChange={(value) => {
                                  updateElement(index, "elementType", value);
                                  // 切换类型时重置内容
                                  const defaultContent: Record<string, any> = {
                                    heading: { text: "" },
                                    text: { text: "" },
                                    button: {
                                      text: "",
                                      url: "",
                                      isPrimary: true,
                                    },
                                    image: { url: "", alt: "" },
                                    card: { title: "", description: "" },
                                    statistic: {
                                      label: "",
                                      value: 0,
                                      suffix: "",
                                    },
                                    testimonial: {
                                      name: "",
                                      role: "",
                                      content: "",
                                    },
                                    list: { items: [] },
                                  };
                                  updateElement(
                                    index,
                                    "content",
                                    JSON.stringify(defaultContent[value] || {}),
                                  );
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(elementTypeLabels).map(
                                    ([value, label]) => (
                                      <SelectItem key={value} value={value}>
                                        {label}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <ElementContentEditor
                              element={element}
                              onChange={(content) =>
                                updateElement(index, "content", content)
                              }
                            />
                          </div>

                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={element.visible}
                                onChange={(e) =>
                                  updateElement(
                                    index,
                                    "visible",
                                    e.target.checked,
                                  )
                                }
                                className="rounded"
                              />
                              显示此元素
                            </label>

                            <div className="flex items-center gap-2">
                              <label className="text-xs text-muted-foreground">
                                排序
                              </label>
                              <Input
                                type="number"
                                value={element.sortOrder}
                                onChange={(e) =>
                                  updateElement(
                                    index,
                                    "sortOrder",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-20 h-8"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </Form>
          </div>

          {/* 固定底部按钮 */}
          <div className="px-6 pb-6 flex-shrink-0 border-t bg-background">
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(handleSubmitAny)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
