import { z } from "zod";

// 表单验证 schema
export const roleFormSchema = z.object({
  name: z.string().min(1, "角色名称不能为空"),
  code: z.string().min(1, "角色编码不能为空"),
  description: z.string().optional(),
  type: z.enum(["system", "team"]).optional(),
  dataScope: z
    .enum(["all", "department", "department_and_sub", "self"])
    .optional(),
  dataScopeDeptIds: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

// 角色数据 schema
export const roleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "角色名称不能为空"),
  code: z.string().min(1, "角色编码不能为空"),
  description: z.string().optional(),
  type: z.string(),
  dataScope: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
  status: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Role = z.infer<typeof roleSchema>;
