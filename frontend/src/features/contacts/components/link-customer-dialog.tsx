import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useLinkCustomer } from "../hooks/use-contacts";
import { CustomerSelector } from "@/components/selectors/CustomerSelector";
import type { Contact } from "../types/contact";

// 关联客户表单验证 schema
const linkCustomerSchema = z.object({
  customerId: z.string().min(1, "请选择客户"),
  isPrimary: z.boolean().optional(),
  isDecisionMaker: z.boolean().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
});

type LinkCustomerFormValues = z.infer<typeof linkCustomerSchema>;

interface LinkCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  onSuccess: () => void;
}

export function LinkCustomerDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: LinkCustomerDialogProps) {
  const form = useForm<LinkCustomerFormValues>({
    resolver: zodResolver(linkCustomerSchema),
    defaultValues: {
      customerId: contact.customerId || "",
      isPrimary: (contact as any).isPrimary || false,
      isDecisionMaker: (contact as any).isDecisionMaker || false,
      position: contact.position || "",
      department: contact.department || "",
    },
  });

  const linkMutation = useLinkCustomer();

  const onSubmit = async (values: LinkCustomerFormValues) => {
    try {
      await linkMutation.mutateAsync({
        contactId: contact.id,
        data: {
          customerId: values.customerId,
          isPrimary: values.isPrimary || false,
          isDecision: values.isDecisionMaker || false,
          position: values.position || undefined,
          department: values.department || undefined,
        },
      });
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("关联失败:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>关联客户</DialogTitle>
          <DialogDescription>
            为联系人 {contact.name} 关联客户企业
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>选择客户 *</FormLabel>
                  <FormControl>
                    <CustomerSelector
                      value={field.value || ""}
                      onChange={(value) => field.onChange(value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>职位</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入职位" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>部门</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入部门" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="isPrimary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>主要联系人</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDecisionMaker"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>决策人</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={linkMutation.isPending}>
                {linkMutation.isPending ? "关联中..." : "关联"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
