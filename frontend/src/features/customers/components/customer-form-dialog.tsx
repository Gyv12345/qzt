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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCustomer, useUpdateCustomer } from "../hooks/use-customers";
import type { Customer } from "../types/customer";

// 客户表单验证 schema
const customerFormSchema = z.object({
  name: z.string().min(1, "公司名称不能为空"),
  shortName: z.string().optional(),
  code: z.string().optional(),
  industry: z.string().optional(),
  scale: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  customerLevel: z.coerce.number().min(0).max(3),
  sourceChannel: z.string().optional(),
  tags: z.string().optional(),
  remark: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onSuccess: () => void;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CustomerFormDialogProps) {
  const isEdit = !!customer;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: customer
      ? {
          name: customer.name,
          shortName: customer.shortName || "",
          code: customer.code || "",
          industry: customer.industry || "",
          scale: customer.scale || "",
          address: customer.address || "",
          website: customer.website || "",
          customerLevel: customer.customerLevel,
          sourceChannel: customer.sourceChannel || "",
          tags: customer.tags || "",
          remark: customer.remark || "",
        }
      : {
          name: "",
          shortName: "",
          code: "",
          industry: "",
          scale: "",
          address: "",
          website: "",
          customerLevel: 0,
          sourceChannel: "",
          tags: "",
          remark: "",
        },
  });

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      if (isEdit && customer) {
        await updateMutation.mutateAsync({ id: customer.id, data: values });
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
          <DialogTitle>{isEdit ? "编辑客户" : "新建客户"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改客户信息" : "填写客户基本信息"}
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
                    <FormLabel>公司名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入公司名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>简称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入简称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>客户编码</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入客户编码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>客户等级</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择客户等级" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">线索</SelectItem>
                        <SelectItem value="1">意向</SelectItem>
                        <SelectItem value="2">正式</SelectItem>
                        <SelectItem value="3">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>行业</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入行业" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>规模</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入规模" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>地址</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入地址" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>网站</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入网站" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceChannel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>来源渠道</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入来源渠道" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标签</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入标签，多个标签用逗号分隔"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入备注信息"
                      className="resize-none"
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
