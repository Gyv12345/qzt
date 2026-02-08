import { z } from "zod";

export const contractTemplateFormSchema = z.object({
  name: z.string().min(1, "模板名称不能为空"),
  code: z.string().min(1, "模板编码不能为空"),
  content: z.string().min(1, "模板内容不能为空"),
  variables: z.string().optional(),
  description: z.string().optional(),
  status: z.number().optional(),
});

export type ContractTemplateFormValues = z.infer<
  typeof contractTemplateFormSchema
>;

export interface ContractTemplate {
  id: string;
  name: string;
  code: string;
  content: string;
  variables?: string;
  description?: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContractTemplateVariable {
  name: string;
  label: string;
  category: string;
  defaultValue?: string;
}

export type ContractTemplatePreview = ContractTemplate & {
  previewContent: string;
};
