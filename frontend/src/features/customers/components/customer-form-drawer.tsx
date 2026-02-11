import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { useTranslation } from "react-i18next";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";
import { useCreateCustomer, useUpdateCustomer } from "../hooks/use-customers";
import type { Customer } from "../types/customer";

// 公司规模选项
const SCALE_OPTIONS = [
  { value: "1-10人", label: "1-10人" },
  { value: "11-50人", label: "11-50人" },
  { value: "51-200人", label: "51-200人" },
  { value: "201-500人", label: "201-500人" },
  { value: "500人以上", label: "500人以上" },
] as const;

// 来源渠道选项
const SOURCE_CHANNEL_OPTIONS = [
  { value: "线上推广", label: "线上推广" },
  { value: "线下活动", label: "线下活动" },
  { value: "客户介绍", label: "客户介绍" },
  { value: "合作伙伴", label: "合作伙伴" },
  { value: "直接咨询", label: "直接咨询" },
  { value: "其他", label: "其他" },
] as const;

// 客户等级枚举
const customerLevelEnum = z.enum(["LEAD", "PROSPECT", "CUSTOMER", "VIP"]);

// 客户表单验证 schema
const customerFormSchema = z.object({
  name: z.string().min(1, "公司名称不能为空"),
  shortName: z.string().optional(),
  code: z.string().optional(),
  industry: z.string().optional(),
  scale: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  customerLevel: customerLevelEnum,
  sourceChannel: z.string().optional(),
  tags: z.string().optional(),
  remark: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onSuccess: (customerId?: string) => void;
}

export function CustomerFormDrawer({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CustomerFormDrawerProps) {
  const { t } = useTranslation();
  const isEdit = !!customer;
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

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
          customerLevel: (customer.customerLevel as any) || "LEAD",
          sourceChannel: customer.sourceChannel || "",
          tags: customer.tags || "",
          remark: customer.remark || "",
        }
      : {
          name: "",
          shortName: "",
          code: "",
          industry: "",
          scale: undefined,
          address: "",
          website: "",
          customerLevel: "LEAD",
          sourceChannel: undefined,
          tags: "",
          remark: "",
        },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      // 过滤掉空字符串和 undefined，只保留有值的字段
      const cleanData = Object.fromEntries(
        Object.entries(values).filter(
          ([_, value]) => value !== "" && value !== undefined,
        ),
      );

      if (isEdit && customer) {
        await updateMutation.mutateAsync({ id: customer.id, data: cleanData });
        onSuccess(customer.id);
      } else {
        const result = await createMutation.mutateAsync(cleanData as any);
        // 返回创建的客户 ID
        onSuccess((result as any)?.id);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("提交失败:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[600px]"}
      >
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>
            {isEdit
              ? t("customer.edit") || "编辑客户"
              : t("customer.create") || "新建客户"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? t("customer.editDescription") || "修改客户信息"
              : t("customer.createDescription") || "填写客户基本信息"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 px-4 pb-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("customer.fields.name") || "公司名称"} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          t("customer.placeholders.name") || "请输入公司名称"
                        }
                        {...field}
                      />
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
                    <FormLabel>
                      {t("customer.fields.shortName") || "简称"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          t("customer.placeholders.shortName") || "请输入简称"
                        }
                        {...field}
                      />
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
                    <FormLabel>
                      {t("customer.fields.code") || "客户编码"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          t("customer.placeholders.code") || "请输入客户编码"
                        }
                        {...field}
                      />
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
                    <FormLabel>
                      {t("customer.fields.customerLevel") || "客户等级"}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              t("customer.placeholders.customerLevel") ||
                              "选择客户等级"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LEAD">
                          {t("customer.levels.LEAD")}
                        </SelectItem>
                        <SelectItem value="PROSPECT">
                          {t("customer.levels.PROSPECT")}
                        </SelectItem>
                        <SelectItem value="CUSTOMER">
                          {t("customer.levels.CUSTOMER")}
                        </SelectItem>
                        <SelectItem value="VIP">
                          {t("customer.levels.VIP")}
                        </SelectItem>
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
                    <FormLabel>
                      {t("customer.fields.industry") || "行业"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          t("customer.placeholders.industry") || "请输入行业"
                        }
                        {...field}
                      />
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
                    <FormLabel>
                      {t("customer.fields.scale") || "规模"}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              t("customer.placeholders.scale") || "请选择规模"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SCALE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <FormLabel>
                    {t("customer.fields.address") || "地址"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        t("customer.placeholders.address") || "请输入地址"
                      }
                      {...field}
                    />
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
                    <FormLabel>
                      {t("customer.fields.website") || "网站"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          t("customer.placeholders.website") || "请输入网站"
                        }
                        {...field}
                      />
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
                    <FormLabel>
                      {t("customer.fields.sourceChannel") || "来源渠道"}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              t("customer.placeholders.sourceChannel") ||
                              "请选择来源渠道"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOURCE_CHANNEL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <FormLabel>{t("customer.fields.tags") || "标签"}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        t("customer.placeholders.tags") ||
                        "请输入标签，多个标签用逗号分隔"
                      }
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
                  <FormLabel>{t("customer.fields.remark") || "备注"}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        t("customer.placeholders.remark") || "请输入备注信息"
                      }
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
                {t("common.cancel") || "取消"}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t("common.submitting") || "提交中..."
                  : isEdit
                    ? t("common.save") || "保存"
                    : t("common.create") || "创建"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
