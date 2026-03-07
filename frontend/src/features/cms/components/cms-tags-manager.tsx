import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, Palette } from "lucide-react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import {
  useCmsTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
} from "../hooks/use-cms-contents";
import type { CmsTag } from "../types/cms";

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

interface CmsTagsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CmsTagsManager({
  open,
  onOpenChange,
  onSuccess,
}: CmsTagsManagerProps) {
  const { data: tags, isLoading } = useCmsTags();
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const deleteMutation = useDeleteTag();

  const [isEditing, setIsEditing] = useState(false);
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

  const startEdit = (tag?: CmsTag) => {
    if (tag) {
      form.reset({
        name: tag.name,
        slug: tag.slug,
        color: tag.color || PRESET_COLORS[0],
        sortOrder: tag.sortOrder,
      });
      setEditingTag(tag);
    } else {
      form.reset({
        name: "",
        slug: "",
        color: PRESET_COLORS[0],
        sortOrder: 0,
      });
      setEditingTag(undefined);
    }
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
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
      cancelEdit();
      onSuccess();
    } catch (error) {
      console.error("提交失败:", error);
    }
  };

  const handleDelete = async (tag: CmsTag) => {
    if (window.confirm(`确定要删除标签"${tag.name}"吗？此操作不可恢复。`)) {
      try {
        await deleteMutation.mutateAsync(tag.id);
        onSuccess();
      } catch (error) {
        console.error("删除失败:", error);
      }
    }
  };

  const sortedTags = Array.isArray(tags)
    ? [...tags].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>标签管理</DialogTitle>
          <DialogDescription>
            管理内容标签，标签可用于分类和筛选内容
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {!isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  已有标签 ({sortedTags.length})
                </h3>
                <Button size="sm" onClick={() => startEdit()}>
                  <Plus className="h-4 w-4 mr-1" />
                  新建标签
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  加载中...
                </div>
              ) : sortedTags.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无标签，点击上方按钮创建
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          style={{
                            backgroundColor: tag.color || undefined,
                          }}
                        >
                          {tag.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          /{tag.slug}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tag.contentCount || 0} 篇内容
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(tag)}
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
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {editingTag ? "编辑标签" : "新建标签"}
                </h3>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                  返回列表
                </Button>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
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
                          <Palette className="h-4 w-4 text-muted-foreground" />
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
                            className="w-16 h-8 p-0 border-0"
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEdit}
                    >
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
