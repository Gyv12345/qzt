import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
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
import { CustomerSelector } from "@/components/selectors/CustomerSelector";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";
import { useCreateContract, useUpdateContract } from "../hooks/use-contracts";
import { ContractProductTable } from "./contract-product-table";
import { contractFormSchema, type ContractFormValues } from "../types/contract";
import type { Contract } from "../types/contract";

interface ContractFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract;
  onSuccess: () => void;
}

export function ContractFormDrawer({
  open,
  onOpenChange,
  contract,
  onSuccess,
}: ContractFormDrawerProps) {
  const isEdit = !!contract;
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";
  const [, setShowCustomerAdvancedSearch] = useState(false);

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: contract
      ? {
          customerId: contract.customerId,
          items:
            contract.items?.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              originalPrice: item.originalPrice,
              actualPrice: item.actualPrice,
            })) || [],
          serviceStart: new Date(contract.serviceStart)
            .toISOString()
            .split("T")[0],
          serviceEnd: new Date(contract.serviceEnd).toISOString().split("T")[0],
          remark: contract.remark || "",
        }
      : {
          customerId: "",
          items: [],
          serviceStart: "",
          serviceEnd: "",
          remark: "",
        },
  });

  const fieldArray = useFieldArray({
    name: "items",
    control: form.control,
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setShowCustomerAdvancedSearch(false);
    }
  }, [open, form]);

  // 如果有合同数据，更新 items
  useEffect(() => {
    if (contract && contract.items) {
      fieldArray.replace(
        contract.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          originalPrice: item.originalPrice,
          actualPrice: item.actualPrice,
        })),
      );
    }
  }, [contract, fieldArray]);

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
      onOpenChange(false);
    } catch (error) {
      console.error("提交失败:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[700px]"}
      >
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>{isEdit ? "编辑合同" : "新建合同"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "修改合同信息" : "填写合同基本信息"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4 px-4 pb-6"
          >
            {/* 客户选择 */}
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

            {/* 产品表格 */}
            <ContractProductTable
              form={form}
              fieldArray={fieldArray}
              disabled={createMutation.isPending || updateMutation.isPending}
            />

            {/* 服务时间 */}
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

            {/* 备注 */}
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
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "提交中..."
                  : isEdit
                    ? "保存"
                    : "创建"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
