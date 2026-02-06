import { useState, useEffect } from "react";
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
import { LoaderCircle } from "lucide-react";
import { useProducts } from "@/features/products/hooks/use-products";
import {
  useCreateProductFlow,
  useUpdateProductFlow,
} from "../hooks/use-product-flows";

// 表单验证 schema
const productFlowFormSchema = z.object({
  productId: z.string().min(1, "请选择产品"),
  name: z.string().min(1, "请输入流程名称"),
  description: z.string().optional(),
});

type ProductFlowFormValues = z.infer<typeof productFlowFormSchema>;

interface ProductFlowFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecord?: {
    id: string;
    productId: string;
    name: string;
    description?: string;
  } | null;
  productId?: string; // 预选产品ID
}

export function ProductFlowFormDialog({
  open,
  onOpenChange,
  editingRecord,
  productId,
}: ProductFlowFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProductFlowFormValues>({
    resolver: zodResolver(productFlowFormSchema),
    defaultValues: {
      productId: productId || "",
      name: "",
      description: "",
    },
  });

  const createMutation = useCreateProductFlow();
  const updateMutation = useUpdateProductFlow();

  // 获取产品列表
  const { data: productsData } = useProducts({ page: 1, pageSize: 100 });
  const products = productsData?.data || [];

  // 当编辑记录变化时，更新表单
  useEffect(() => {
    if (editingRecord) {
      form.reset({
        productId: editingRecord.productId,
        name: editingRecord.name,
        description: editingRecord.description || "",
      });
    } else {
      form.reset({
        productId: productId || "",
        name: "",
        description: "",
      });
    }
  }, [editingRecord, productId, form]);

  const onSubmit = async (values: ProductFlowFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await updateMutation.mutateAsync({
          id: editingRecord.id,
          data: values,
        });
      } else {
        await createMutation.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingRecord ? "编辑产品流程" : "创建产品流程"}
          </DialogTitle>
          <DialogDescription>
            {editingRecord
              ? "修改产品流程的信息"
              : "创建新的产品流程，定义产品的业务处理步骤"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 产品选择 */}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>所属产品</FormLabel>
                  <select
                    {...field}
                    disabled={!!productId || !!editingRecord}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">请选择产品</option>
                    {products.map((product: any) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 流程名称 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>流程名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：标准开单流程" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 流程描述 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>流程描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="描述该流程的用途和适用场景"
                      rows={3}
                      {...field}
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
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingRecord ? "保存" : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
