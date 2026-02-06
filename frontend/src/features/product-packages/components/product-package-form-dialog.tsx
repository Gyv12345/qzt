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
import { Switch } from "@/components/ui/switch";
import { LoaderCircle } from "lucide-react";
import {
  useCreateProductPackage,
  useUpdateProductPackage,
} from "../hooks/use-product-packages";

// 表单验证 schema
const productPackageFormSchema = z.object({
  name: z.string().min(1, "请输入套餐名称"),
  description: z.string().optional(),
  price: z.number().min(0, "价格不能为负数"),
  originalPrice: z.number().min(0, "原价不能为负数").optional(),
});

type ProductPackageFormValues = z.infer<typeof productPackageFormSchema>;

interface ProductPackageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecord?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
  } | null;
}

export function ProductPackageFormDialog({
  open,
  onOpenChange,
  editingRecord,
}: ProductPackageFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProductPackageFormValues>({
    resolver: zodResolver(productPackageFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      originalPrice: undefined,
    },
  });

  const createMutation = useCreateProductPackage();
  const updateMutation = useUpdateProductPackage();

  // 当编辑记录变化时，更新表单
  useEffect(() => {
    if (editingRecord) {
      form.reset({
        name: editingRecord.name,
        description: editingRecord.description || "",
        price: editingRecord.price,
        originalPrice: editingRecord.originalPrice,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        price: 0,
        originalPrice: undefined,
      });
    }
  }, [editingRecord, form]);

  const onSubmit = async (values: ProductPackageFormValues) => {
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
            {editingRecord ? "编辑产品套餐" : "创建产品套餐"}
          </DialogTitle>
          <DialogDescription>
            {editingRecord
              ? "修改产品套餐的信息和价格"
              : "创建新的产品套餐，将多个产品组合销售"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 套餐名称 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>套餐名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：企业基础版套餐" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 套餐描述 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>套餐描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="描述套餐包含的内容和适用范围"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 套餐价格 */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>套餐价格 (元)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
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

            {/* 原价 */}
            <FormField
              control={form.control}
              name="originalPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>原价 (元) - 可选</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="用于显示折扣"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            ? parseFloat(e.target.value) || 0
                            : undefined,
                        )
                      }
                      value={field.value ?? ""}
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
