import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { useEffect } from "react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";
import {
  useCreateContractTemplate,
  useUpdateContractTemplate,
} from "../hooks/use-contract-templates";
import { RichTextEditor, CONTRACT_VARIABLES } from "./rich-text-editor";
import { contractTemplateFormSchema } from "../types/contract-template";
import type { ContractTemplate } from "../types/contract-template";

type ContractTemplateFormValues = z.infer<typeof contractTemplateFormSchema>;

interface ContractTemplateFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ContractTemplate;
  onSuccess: () => void;
}

export function ContractTemplateFormDrawer({
  open,
  onOpenChange,
  template,
  onSuccess,
}: ContractTemplateFormDrawerProps) {
  const isEdit = !!template;
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  const form = useForm<ContractTemplateFormValues>({
    resolver: zodResolver(contractTemplateFormSchema),
    defaultValues: template
      ? {
          name: template.name,
          code: template.code,
          content: template.content,
          variables: template.variables || "",
          description: template.description || "",
          status: template.status,
        }
      : {
          name: "",
          code: "",
          content: "",
          variables: "",
          description: "",
          status: 1,
        },
  });

  const createMutation = useCreateContractTemplate();
  const updateMutation = useUpdateContractTemplate();

  const watchedContent = form.watch("content");

  // 自动生成模板编码
  const generateCode = (name: string) => {
    // 转换为拼音首字母或简化编码
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .substring(0, 20);
  };

  const handleNameChange = (value: string) => {
    form.setValue("name", value);
    if (!isEdit && !form.getValues("code")) {
      form.setValue("code", generateCode(value));
    }
  };

  const onSubmit = async (values: ContractTemplateFormValues) => {
    try {
      if (isEdit && template) {
        await updateMutation.mutateAsync({
          id: template.id,
          data: values,
        });
      } else {
        // 创建时排除 status 字段，后端 CreateContractTemplateDto 不接受该字段
        const { status, ...createData } = values;
        await createMutation.mutateAsync(createData);
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("提交失败:", error);
    }
  };

  // 监听抽屉关闭，重置表单
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Sheet
      open={open}
      onOpenChange={(state) => {
        form.reset();
        onOpenChange(state);
      }}
    >
      <SheetContent side={drawerSide} className="w-[600px] sm:w-[800px]">
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>{isEdit ? "编辑合同模板" : "新建合同模板"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "修改合同模板信息" : "填写合同模板基本信息"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="contract-template-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 px-4 pb-6 overflow-y-auto max-h-[calc(100vh-180px)]"
          >
            {/* 模板名称 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>模板名称 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入模板名称"
                      {...field}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 模板编码 */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>模板编码 *</FormLabel>
                  <FormControl>
                    <Input placeholder="TEMPLATE_CODE" {...field} />
                  </FormControl>
                  <FormDescription>
                    模板的唯一标识，用于系统内部引用
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 模板描述 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>模板描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入模板描述"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 模板内容 */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>模板内容 *</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      content={watchedContent}
                      onChange={field.onChange}
                      placeholder="请输入合同模板内容，可以插入变量..."
                    />
                  </FormControl>
                  <FormDescription className="flex items-center justify-between">
                    <span>使用编辑器工具栏的"插入变量"按钮添加动态变量</span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 变量列表提示 */}
            <div className="space-y-2 border rounded-md p-3 bg-muted/50">
              <FormLabel className="text-sm">可用变量列表</FormLabel>
              <div className="flex flex-wrap gap-2">
                {CONTRACT_VARIABLES.map((variable) => (
                  <Badge
                    key={variable.name}
                    variant="outline"
                    className="text-xs"
                  >
                    {variable.label}
                    <code className="ml-1 text-muted-foreground">
                      {"{{" + variable.name + "}}"}
                    </code>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 状态（仅编辑时显示） */}
            {isEdit && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant={field.value === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => field.onChange(1)}
                        >
                          启用
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === 0 ? "default" : "outline"}
                          size="sm"
                          onClick={() => field.onChange(0)}
                        >
                          禁用
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>

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
            form="contract-template-form"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "提交中..."
              : isEdit
                ? "保存"
                : "创建"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
