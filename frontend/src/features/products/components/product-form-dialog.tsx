import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateProduct, useUpdateProduct } from "../hooks/use-products";
import type { Product } from "../types/product";

const productFormSchema = z.object({
  name: z.string().min(1, "产品名称不能为空"),
  code: z.string().min(1, "产品代码不能为空"),
  description: z.string().optional(),
  price: z.number().min(0, "价格必须大于等于0"),
  invoiceLimit: z.number().min(0, "开票额度必须大于等于0"),
  invoiceCount: z.number().min(0, "开票张数必须大于等于0"),
  overLimitPrice: z.number().min(0, "超额单价必须大于等于0"),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  onSuccess: () => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormDialogProps) {
  const isEdit = !!product;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          name: product.name,
          code: product.code,
          description: product.description || "",
          price: product.price,
          invoiceLimit: product.invoiceLimit,
          invoiceCount: product.invoiceCount,
          overLimitPrice: product.overLimitPrice,
        }
      : {
          name: "",
          code: "",
          description: "",
          price: 0,
          invoiceLimit: 0,
          invoiceCount: 0,
          overLimitPrice: 0,
        },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑产品" : "新建产品"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改产品信息" : "填写产品基本信息"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

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

            <div className="grid grid-cols-3 gap-4">
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
                name="invoiceLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>开票额度/月 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="请输入额度"
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
                name="invoiceCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>套餐开票张数 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="请输入张数"
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
            </div>

            <FormField
              control={form.control}
              name="overLimitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>超额单价 *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="请输入超额单价"
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "提交中..."
                  : isEdit
                    ? "保存"
                    : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
