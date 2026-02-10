import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { useEffect, useState } from "react";
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
import { useCreatePayment, useUpdatePayment } from "../hooks/use-payments";
import type { Payment } from "../types/payment";

// 收款表单验证 schema
const paymentFormSchema = z.object({
  contractId: z.string().min(1, "请选择或输入合同ID"),
  amount: z.number().min(0.01, "收款金额必须大于0"),
  method: z.coerce.number().min(1).max(4),
  voucherUrl: z.string().optional(),
  payTime: z.string().min(1, "请选择付款时间"),
  status: z.string().optional(),
  remark: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Payment;
  onSuccess: () => void;
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: PaymentFormDialogProps) {
  const isEdit = !!payment;
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: payment
      ? {
          contractId: payment.contractId,
          amount: payment.amount,
          method: payment.method,
          voucherUrl: payment.voucherUrl || "",
          payTime: payment.payTime ? payment.payTime.slice(0, 10) : "",
          status: payment.status || "PENDING",
          remark: payment.remark || "",
        }
      : {
          contractId: "",
          amount: 0,
          method: 1,
          voucherUrl: "",
          payTime: new Date().toISOString().slice(0, 10),
          status: "PENDING",
          remark: "",
        },
  });

  // 重置表单当对话框打开/关闭时
  useEffect(() => {
    if (!open) {
      form.reset();
      setIsUploading(false);
    }
  }, [open, form]);

  const createMutation = useCreatePayment();
  const updateMutation = useUpdatePayment();

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      // 清理空字符串
      const cleanedValues = {
        ...values,
        voucherUrl: values.voucherUrl || undefined,
        remark: values.remark || undefined,
      };

      if (isEdit && payment) {
        await updateMutation.mutateAsync({
          id: payment.id,
          data: cleanedValues as any,
        });
      } else {
        await createMutation.mutateAsync(cleanedValues as any);
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("提交失败:", error);
    }
  };

  // 简化的文件上传处理（实际项目中应该使用真实的文件上传服务）
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 这里应该是实际的文件上传逻辑
      // 目前模拟返回一个 URL
      setTimeout(() => {
        const mockUrl = URL.createObjectURL(file);
        form.setValue("voucherUrl", mockUrl);
        setIsUploading(false);
      }, 1000);
    } catch (error) {
      console.error("上传失败:", error);
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑收款记录" : "新建收款记录"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改收款记录信息" : "填写收款记录基本信息"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="contractId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>合同ID *</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入合同ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>收款金额（元）*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="请输入收款金额"
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
                name="payTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>付款时间 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>收款方式 *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择收款方式" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">银行转账</SelectItem>
                        <SelectItem value="2">微信</SelectItem>
                        <SelectItem value="3">支付宝</SelectItem>
                        <SelectItem value="4">现金</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>收款状态</FormLabel>
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
                        <SelectItem value="PENDING">待确认</SelectItem>
                        <SelectItem value="CONFIRMED">已确认</SelectItem>
                        <SelectItem value="REJECTED">已拒绝</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="voucherUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>付款凭证</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                      {field.value && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground flex-1 truncate">
                            {field.value}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => field.onChange("")}
                          >
                            清除
                          </Button>
                        </div>
                      )}
                      {isUploading && (
                        <p className="text-sm text-muted-foreground">
                          上传中...
                        </p>
                      )}
                    </div>
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
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  isUploading
                }
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
