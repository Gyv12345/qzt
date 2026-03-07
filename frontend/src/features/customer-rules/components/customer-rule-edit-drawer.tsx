import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  useUpdateCustomerRule,
  type CustomerRule,
} from "../hooks/use-customer-rules";
import {
  customerRuleFormSchema,
  type CustomerRuleFormValues,
} from "../types/customer-rule";

type CustomerRuleEditDrawerProps = {
  rule: CustomerRule | null;
  open: boolean;
  onClose: () => void;
};

export function CustomerRuleEditDrawer({
  rule,
  open,
  onClose,
}: CustomerRuleEditDrawerProps) {
  const { t } = useTranslation();
  const updateMutation = useUpdateCustomerRule();
  const [daysValue, setDaysValue] = useState(rule?.daysValue || 0);
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  const form = useForm<CustomerRuleFormValues>({
    resolver: zodResolver(customerRuleFormSchema),
    defaultValues: {
      title: rule?.title || "",
      description: rule?.description || "",
      daysValue: rule?.daysValue || 0,
      enabled: rule?.enabled || false,
    },
  });

  useEffect(() => {
    if (rule) {
      form.reset({
        title: rule.title,
        description: rule.description || "",
        daysValue: rule.daysValue,
        enabled: rule.enabled,
      });
      setDaysValue(rule.daysValue);
    }
  }, [rule, form]);

  const handleSubmit = async (values: CustomerRuleFormValues) => {
    if (!rule) return;

    try {
      await updateMutation.mutateAsync({
        id: rule.id,
        data: values,
      });
      onClose();
    } catch (error) {
      console.error("更新规则失败:", error);
    }
  };

  const handleDaysChange = (value: number) => {
    const newValue = Math.max(0, value);
    setDaysValue(newValue);
    form.setValue("daysValue", newValue);
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[600px]"}
      >
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>{t("customerRule.edit.title")}</SheetTitle>
          <SheetDescription>
            {t("customerRule.edit.description")}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 px-4 pb-6"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("customerRule.fields.title")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("customerRule.placeholders.title")}
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
                  <FormLabel>{t("customerRule.fields.description")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("customerRule.placeholders.description")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="daysValue"
              render={({ field: _field }) => (
                <FormItem>
                  <FormLabel>{t("customerRule.fields.daysValue")}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDaysChange(daysValue - 1)}
                        disabled={daysValue <= 0}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={daysValue}
                        onChange={(e) =>
                          handleDaysChange(parseInt(e.target.value) || 0)
                        }
                        className="w-20 text-center"
                        min={0}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDaysChange(daysValue + 1)}
                      >
                        +
                      </Button>
                      <span className="text-sm text-muted-foreground">天</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("customerRule.fields.enabled")}
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {t("customerRule.helpText.enabled")}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <SheetFooter className="px-0">
              <Button type="button" variant="outline" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("common.save")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
