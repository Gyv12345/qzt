import { useQuery } from "@tanstack/react-query";
import { getScrmApi } from "@/services/api";
import type { PermissionTreeNode } from "@/features/permissions/data/schema";

// 菜单树节点类型（从 API 返回）
export interface MenuNode {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  permissions?: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    description?: string;
    status: number;
  }>;
  children?: MenuNode[];
}

/**
 * 获取菜单树 Hook
 */
export function useMenuTree() {
  return useQuery<MenuNode[]>({
    queryKey: ["menu-tree"],
    queryFn: async () => {
      const { permissionControllerGetMenuTree } = getScrmApi();
      const result = await permissionControllerGetMenuTree();
      return result as MenuNode[];
    },
  });
}

/**
 * 将菜单树转换为权限树节点格式
 */
export function convertToPermissionTree(
  menus: MenuNode[],
): PermissionTreeNode[] {
  return menus.map((menu) => ({
    id: menu.id,
    name: menu.name,
    type: "menu" as const,
    permissions: menu.permissions?.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      type: p.type as "menu" | "button" | "data",
      description: p.description,
      status: p.status,
      createdAt: "",
      updatedAt: "",
    })),
    children: menu.children ? convertToPermissionTree(menu.children) : [],
  }));
}

/**
 * 收集树中所有权限 ID
 */
export function collectPermissionIds(nodes: PermissionTreeNode[]): string[] {
  const ids: string[] = [];

  function traverse(node: PermissionTreeNode) {
    if (node.permissions) {
      node.permissions.forEach((p) => ids.push(p.id));
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  nodes.forEach(traverse);
  return ids;
}

/**
 * 查找节点及其所有子权限 ID
 */
export function collectNodePermissionIds(node: PermissionTreeNode): string[] {
  const ids: string[] = [];

  if (node.permissions) {
    node.permissions.forEach((p) => ids.push(p.id));
  }

  if (node.children) {
    node.children.forEach((child) => {
      ids.push(...collectNodePermissionIds(child));
    });
  }

  return ids;
}
