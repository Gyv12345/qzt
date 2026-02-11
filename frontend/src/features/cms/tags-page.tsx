/**
 * 标签管理页面
 */

import { useState } from "react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, Palette, Tag as TagIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import {
  useCmsTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
} from "./hooks/use-cms-contents";
import type { CmsTag } from "./types/cms";

const tagFormSchema = z.object({
  name: z.string().min(1, "标签名称不能为空"),
  slug: z
    .string()
    .min(1, "Slug不能为空")
    .regex(/^[a-z0-9-]+$/, "Slug只能包含小写字母、数字和连字符"),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
});

type TagFormValues = z.infer<typeof tagFormSchema>;

// 预设颜色
const PRESET_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export function CmsTagsPage() {
  const { data: tags, isLoading, refetch } = useCmsTags();
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const deleteMutation = useDeleteTag();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<CmsTag | undefined>();

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema) as Resolver<TagFormValues>,
    defaultValues: {
      name: "",
      slug: "",
      color: PRESET_COLORS[0],
      sortOrder: 0,
    },
  });

  const openCreateDialog = () => {
    form.reset({
      name: "",
      slug: "",
      color: PRESET_COLORS[0],
      sortOrder: 0,
    });
    setEditingTag(undefined);
    setIsDialogOpen(true);
  };

  const openEditDialog = (tag: CmsTag) => {
    form.reset({
      name: tag.name,
      slug: tag.slug,
      color: tag.color || PRESET_COLORS[0],
      sortOrder: tag.sortOrder,
    });
    setEditingTag(tag);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTag(undefined);
    form.reset();
  };

  const onSubmit = async (values: TagFormValues) => {
    try {
      if (editingTag) {
        await updateMutation.mutateAsync({ id: editingTag.id, data: values });
      } else {
        await createMutation.mutateAsync(values as any);
      }
      closeDialog();
      refetch();
    } catch (error) {
      console.error("提交失败:", error);
    }
  };

  const handleDelete = async (tag: CmsTag) => {
    if (window.confirm(`确定要删除标签"${tag.name}"吗？此操作不可恢复。`)) {
      try {
        await deleteMutation.mutateAsync(tag.id);
        refetch();
      } catch (error) {
        console.error("删除失败:", error);
      }
    }
  };

  const sortedTags = Array.isArray(tags)
    ? [...tags].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    : [];

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">标签管理</h2>
          <p className="text-muted-foreground">
            管理内容标签，标签可用于分类和筛选内容
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          新建标签
        </Button>
      </div>

      {/* 标签列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      ) : sortedTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <TagIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <div className="text-muted-foreground">
            暂无标签，点击上方按钮创建
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Badge
                  style={{
                    backgroundColor: tag.color || undefined,
                  }}
                  className="shrink-0"
                >
                  {tag.name}
                </Badge>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm text-muted-foreground truncate">
                    /{tag.slug}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tag.contentCount || 0} 篇内容 · 排序: {tag.sortOrder}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEditDialog(tag)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(tag)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑/创建对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTag ? "编辑标签" : "新建标签"}</DialogTitle>
            <DialogDescription>
              {editingTag
                ? "修改标签信息，点击保存生效"
                : "创建新标签用于内容分类"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标签名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入标签名称" {...field} />
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
                    <FormLabel>URL Slug *</FormLabel>
                    <FormControl>
                      <Input placeholder="url-friendly-slug" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标签颜色</FormLabel>
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${
                              field.value === color
                                ? "border-foreground"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => field.onChange(color)}
                          />
                        ))}
                      </div>
                      <Input
                        type="color"
                        className="w-16 h-8 p-0 border-0 shrink-0"
                        {...field}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>排序</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormDescription>数字越小越靠前</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "提交中..."
                    : editingTag
                      ? "保存"
                      : "创建"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Main>
  );
}
