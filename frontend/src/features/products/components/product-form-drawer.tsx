import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PlusIcon, XIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";
import { useCreateProduct, useUpdateProduct } from "../hooks/use-products";
import { ImageUpload } from "@/components/ui/image-upload";
import type { Product } from "../types/product";

const productFormSchema = z.object({
  name: z.string().min(1, "产品名称不能为空"),
  code: z.string().min(1, "产品代码不能为空"),
  description: z.string().optional(),
  price: z.number().min(0, "价格必须大于等于0"),
  timeline: z.array(z.string()).optional(),
  imageId: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  onSuccess: () => void;
}

export function ProductFormDrawer({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormDrawerProps) {
  const isEdit = !!product;
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          name: product.name,
          code: product.code,
          description: product.description || "",
          price: product.price,
          timeline: product.timeline || [],
          imageId: product.imageId,
        }
      : {
          name: "",
          code: "",
          description: "",
          price: 0,
          timeline: [],
          imageId: undefined,
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "timeline",
  });

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const onSubmit = async (values: ProductFormValues) => {
    try {
      if (isEdit && product) {
        await updateMutation.mutateAsync({ id: product.id, data: values });
      } else {
        await createMutation.mutateAsync(values as any);
      }
      onSuccess();
    } catch (error) {
      console.error("提交失败:", error);
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
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[500px]"}
      >
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>{isEdit ? "编辑产品" : "新建产品"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "修改产品信息" : "填写产品基本信息"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="product-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 px-4 pb-6 overflow-y-auto max-h-[calc(100vh-180px)]"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>产品名称 *</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入产品名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>产品代码 *</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入产品代码" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>价格 *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="请输入价格"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>产品描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入产品描述"
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
              name="imageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>产品图片</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      disabled={
                        createMutation.isPending || updateMutation.isPending
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>产品时间轴</FormLabel>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Textarea
                        {...form.register(`timeline.${index}`)}
                        placeholder="请输入节点描述"
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="mt-1"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => append("")}
                className="w-full"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                添加时间轴节点
              </Button>
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
            form="product-form"
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
