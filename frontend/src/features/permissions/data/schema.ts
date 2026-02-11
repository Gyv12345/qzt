import { z } from "zod";

// 基础权限类型（用于表单和数据）
const basePermissionSchema = {
  name: z.string(),
  code: z.string(),
  type: z.enum(["menu", "button", "data"]),
  description: z.string().optional(),
  parentId: z.string().optional(),
  status: z.number(),
};

// 表单验证 schema
export const permissionFormSchema = z.object({
  ...basePermissionSchema,
  name: z.string().min(1, "权限名称不能为空"),
  code: z.string().min(1, "权限编码不能为空"),
});

export type PermissionFormValues = z.infer<typeof permissionFormSchema>;

// 权限数据 schema（需要显式类型注解以支持递归）
const permissionSchemaInner: z.ZodType<{
  id: string;
  name: string;
  code: string;
  type: "menu" | "button" | "data";
  description?: string;
  parentId?: string;
  status: number;
  createdAt: string;
  updatedAt: string;
  children?: any[];
}> = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  type: z.enum(["menu", "button", "data"]),
  description: z.string().optional(),
  parentId: z.string().optional(),
  status: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  children: z.array(z.lazy(() => permissionSchemaInner)).optional(),
});

export const permissionSchema = permissionSchemaInner;

export type Permission = z.infer<typeof permissionSchema>;

// 菜单树节点类型
export interface MenuNode {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  permissions?: Permission[];
  children?: MenuNode[];
}

// 权限树节点类型（用于树状表格和选择器）
export interface PermissionTreeNode {
  id: string;
  name: string;
  type: "menu" | "permission";
  code?: string;
  permissionType?: string; // menu/button/data
  parentId?: string | null;
  permissions?: Permission[];
  children?: PermissionTreeNode[];
  level?: number;
}
