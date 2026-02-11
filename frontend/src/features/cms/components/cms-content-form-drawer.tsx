import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";
import { useCreateContent, useUpdateContent } from "../hooks/use-cms-contents";
import { useProducts } from "@/features/products/hooks/use-products";
import { useUsers } from "@/features/users/hooks/use-users";
import type { CmsContent, ContentType } from "../types/cms";

const cmsContentFormSchema = z.object({
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

type CmsContentFormValues = z.infer<typeof cmsContentFormSchema>;

interface CmsContentFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content?: CmsContent;
  defaultContentType?: ContentType;
  onSuccess: () => void;
}

export function CmsContentFormDrawer({
  open,
  onOpenChange,
  content,
  defaultContentType = "ARTICLE",
  onSuccess,
}: CmsContentFormDrawerProps) {
  const isEdit = !!content;
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  const { data: products } = useProducts({ page: 1, pageSize: 100 });
  const { data: users } = useUsers({ page: 1, pageSize: 100 });

  const form = useForm<CmsContentFormValues>({
    resolver: zodResolver(cmsContentFormSchema),
    defaultValues: content
      ? {
          title: content.title,
          slug: content.slug,
          content: content.content,
          excerpt: content.excerpt || "",
          coverImage: content.coverImage || "",
          status: content.status,
          contentType: content.contentType,
          productId: content.productId,
          userId: content.userId,
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
          contentType: defaultContentType,
          productId: "",
          userId: "",
          metaTitle: "",
          metaDesc: "",
          keywords: "",
        },
  });

  const createMutation = useCreateContent();
  const updateMutation = useUpdateContent();

  const currentContentType = form.watch("contentType");

  const onSubmit = async (values: CmsContentFormValues) => {
    try {
      if (isEdit && content) {
        await updateMutation.mutateAsync({ id: content.id, data: values });
      } else {
        await createMutation.mutateAsync(values as any);
      }
      onSuccess();
    } catch (error) {
      console.error("提交失败:", error);
    }
  };

  // 自动生成 slug
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleTitleChange = (value: string) => {
    form.setValue("title", value);
    if (!isEdit && !form.getValues("slug")) {
      form.setValue("slug", generateSlug(value));
    }
  };

  // 监听抽屉关闭，重置表单
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Sheet
      open={open}
      onOpenChange={(state) => {
        form.reset();
        onOpenChange(state);
      }}
    >
      <SheetContent side={drawerSide} className="w-[600px] sm:w-[700px]">
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>{isEdit ? "编辑内容" : "新建内容"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "修改内容信息" : "填写内容基本信息"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="cms-content-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 px-4 pb-6 overflow-y-auto max-h-[calc(100vh-180px)]"
          >
            {/* 标题 */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标题 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入标题"
                      {...field}
                      onChange={(e) => handleTitleChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Slug */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug *</FormLabel>
                  <FormControl>
                    <Input placeholder="url-friendly-slug" {...field} />
                  </FormControl>
                  <FormDescription>
                    用于生成 URL，只能包含小写字母、数字和连字符
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 摘要 */}
            <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>摘要</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入内容摘要"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 封面图 */}
            <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>封面图 URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 内容 */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>内容 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入内容（支持 Markdown）"
                      className="resize-none min-h-[200px] font-mono"
                      rows={10}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    TODO(human): 集成富文本编辑器（如 TipTap）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 状态 */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>状态 *</FormLabel>
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

            {/* 产品关联 */}
            {currentContentType === "PRODUCT_SHOWCASE" && (
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>关联产品</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择产品" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.data?.map((product: any) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 人员关联 */}
            {currentContentType === "PROFILE" && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>关联用户</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择用户" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users?.data?.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* SEO 设置 */}
            <div className="space-y-3 border-t pt-4">
              <FormLabel>SEO 设置</FormLabel>

              <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SEO 标题</FormLabel>
                    <FormControl>
                      <Input placeholder="留空则使用内容标题" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metaDesc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SEO 描述</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="留空则使用内容摘要"
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
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>关键词</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="关键词1, 关键词2, 关键词3"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <SheetFooter className="px-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="submit"
            form="cms-content-form"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "提交中..."
              : isEdit
                ? "保存"
                : "创建"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
