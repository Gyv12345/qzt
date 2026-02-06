import { z } from "zod";

// 表单验证 schema
export const permissionFormSchema = z.object({
  name: z.string().min(1, "权限名称不能为空"),
  code: z.string().min(1, "权限编码不能为空"),
  type: z.enum(["menu", "button", "data"]),
  description: z.string().optional(),
  status: z.number().default(1),
});

export type PermissionFormValues = z.infer<typeof permissionFormSchema>;

// 权限数据 schema
export const permissionSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  type: z.enum(["menu", "button", "data"]),
  description: z.string().optional(),
  status: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

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
  type: 'menu' | 'permission';
  code?: string;
  permissionType?: string; // menu/button/data
  permissions?: Permission[];
  children?: PermissionTreeNode[];
  level?: number;
}
