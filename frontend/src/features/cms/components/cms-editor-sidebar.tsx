/**
 * CMS 编辑器左侧边栏
 * 包含内容设置、SEO 配置等字段
 */

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UseFormReturn } from "react-hook-form";
import { useProducts } from "@/features/products/hooks/use-products";
import { useUsers } from "@/features/users/hooks/use-users";
import type { CmsEditorValues } from "./cms-content-editor";

interface CmsEditorSidebarProps {
  form: UseFormReturn<CmsEditorValues>;
  isEdit: boolean;
}

export function CmsEditorSidebar({
  form,
}: Omit<CmsEditorSidebarProps, "isEdit">) {
  const { data: products } = useProducts({ page: 1, pageSize: 100 });
  const { data: users } = useUsers({ page: 1, pageSize: 100 });

  const currentContentType = form.watch("contentType");

  return (
    <ScrollArea className="flex-1 px-6 py-4">
      <Form {...form}>
        <div className="space-y-6">
          {/* 基本信息组 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">基本信息</h3>

            {/* 状态 */}
            <FormField
              control={form.control}
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

            {/* Slug */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug</FormLabel>
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
          </div>

          <Separator />

          {/* 内容设置组 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">内容设置</h3>

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
                      rows={3}
                      {...field}
                    />
                  </FormControl>
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
          </div>

          <Separator />

          {/* SEO 设置组 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">SEO 设置</h3>

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
                      rows={3}
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
                    <Input placeholder="关键词1, 关键词2, 关键词3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </Form>
    </ScrollArea>
  );
}
