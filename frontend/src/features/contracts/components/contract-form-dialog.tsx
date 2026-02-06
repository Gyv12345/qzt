import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CustomerSelector } from "@/components/selectors/CustomerSelector";
import { ProductSelector } from "@/components/selectors/ProductSelector";
import { useCreateContract, useUpdateContract } from "../hooks/use-contracts";
import type { Contract } from "../types/contract";

// 合同表单验证 schema
const contractFormSchema = z.object({
  customerId: z.string().min(1, "请选择客户"),
  productId: z.string().min(1, "请选择产品"),
  amount: z.number().min(0, "金额必须大于等于0"),
  serviceStart: z.string().min(1, "请选择服务开始日期"),
  serviceEnd: z.string().min(1, "请选择服务结束日期"),
  remark: z.string().optional(),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract;
  onSuccess: () => void;
}

export function ContractFormDialog({
  open,
  onOpenChange,
  contract,
  onSuccess,
}: ContractFormDialogProps) {
  const isEdit = !!contract;
  const [showCustomerAdvancedSearch, setShowCustomerAdvancedSearch] =
    useState(false);

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: contract
      ? {
          customerId: contract.customerId,
          productId: contract.productId,
          amount: contract.amount,
          serviceStart: contract.serviceStart,
          serviceEnd: contract.serviceEnd,
          remark: contract.remark || "",
        }
      : {
          customerId: "",
          productId: "",
          amount: 0,
          serviceStart: "",
          serviceEnd: "",
          remark: "",
        },
  });

  const createMutation = useCreateContract();
  const updateMutation = useUpdateContract();

  const onSubmit = async (values: ContractFormValues) => {
    try {
      if (isEdit && contract) {
        await updateMutation.mutateAsync({ id: contract.id, data: values });
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
          <DialogTitle>{isEdit ? "编辑合同" : "新建合同"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改合同信息" : "填写合同基本信息"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>客户 *</FormLabel>
                    <FormControl>
                      <CustomerSelector
                        value={field.value}
                        onChange={field.onChange}
                        onAdvancedSearch={() =>
                          setShowCustomerAdvancedSearch(true)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>产品 *</FormLabel>
                    <FormControl>
                      <ProductSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>合同金额 *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="请输入合同金额"
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serviceStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>服务开始日期 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>服务结束日期 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
