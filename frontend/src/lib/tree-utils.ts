import type { MenuNode } from "@/features/menus/hooks/use-all-menus";

/**
 * 扁平化树节点，用于虚拟滚动
 * 只包含展开节点的子节点，减少虚拟滚动计算量
 */
export interface FlatNode {
  id: string;
  name: string;
  permissionCode?: string | null;
  type: string;
  level: number;
  hasChildren: boolean;
  // 原始节点引用，用于获取更多数据
  node: MenuNode;
}

/**
 * 构建父子关系映射表
 * 预处理整棵树，构建每个节点到其所有子孙节点的映射
 * 用于父子联动选择，避免运行时递归遍历
 *
 * @param nodes - 菜单树节点数组
 * @returns Map<nodeId, descendantIds[]> - 每个节点到其所有子孙节点 ID 的映射
 *
 * @example
 * const tree = [
 *   { id: '1', children: [{ id: '1-1' }, { id: '1-2' }] }
 * ]
 * const map = buildParentChildMap(tree)
 * map.get('1') // ['1', '1-1', '1-2'] (包含自身)
 * map.get('1-1') // ['1-1'] (无子节点，只包含自身)
 */
export function buildParentChildMap(nodes: MenuNode[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  /**
   * 递归收集节点及其所有子孙节点的 ID
   * @param node - 当前节点
   * @returns 该节点及所有子孙节点的 ID 数组
   */
  function collectDescendants(node: MenuNode): string[] {
    const ids: string[] = [node.id];

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        ids.push(...collectDescendants(child));
      }
    }

    return ids;
  }

  /**
   * 递归遍历树，为每个节点构建映射
   */
  function traverse(nodes: MenuNode[]) {
    for (const node of nodes) {
      const descendantIds = collectDescendants(node);
      map.set(node.id, descendantIds);

      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return map;
}

/**
 * 将树形结构转换为扁平数组
 * 根据展开状态动态生成扁平数组，只包含展开节点的子节点
 *
 * @param nodes - 菜单树节点数组
 * @param expandedIds - 当前展开的节点 ID 集合
 * @param level - 当前层级（用于缩进），默认为 0
 * @returns FlatNode[] - 扁平化的节点数组
 *
 * @example
 * const tree = [
 *   { id: '1', name: '菜单1', children: [{ id: '1-1', name: '子菜单' }] }
 * ]
 * // 全部展开
 * buildFlatTree(tree, new Set(['1']))
 * // [
 * //   { id: '1', name: '菜单1', level: 0, hasChildren: true },
 * //   { id: '1-1', name: '子菜单', level: 1, hasChildren: false }
 * // ]
 *
 * // 全部收起
 * buildFlatTree(tree, new Set())
 * // [
 * //   { id: '1', name: '菜单1', level: 0, hasChildren: true }
 * // ]
 */
export function buildFlatTree(
  nodes: MenuNode[],
  expandedIds: Set<string>,
  level = 0,
): FlatNode[] {
  const flatNodes: FlatNode[] = [];

  for (const node of nodes) {
    const hasChildren = !!(node.children && node.children.length > 0);

    // 添加当前节点
    flatNodes.push({
      id: node.id,
      name: node.name,
      permissionCode: node.permissionCode ?? undefined,
      type: node.type ?? "menu",
      level,
      hasChildren,
      node,
    });

    // 如果节点已展开且有子节点，递归添加子节点
    if (hasChildren && expandedIds.has(node.id)) {
      flatNodes.push(...buildFlatTree(node.children!, expandedIds, level + 1));
    }
  }

  return flatNodes;
}

/**
 * 收集树中所有节点的 ID
 * 用于全选/展开全部等操作
 *
 * @param nodes - 菜单树节点数组
 * @returns 所有节点的 ID 数组
 */
export function collectAllNodeIds(nodes: MenuNode[]): string[] {
  const ids: string[] = [];

  function traverse(nodes: MenuNode[]) {
    for (const node of nodes) {
      ids.push(node.id);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return ids;
}

/**
 * 收集所有有子节点的节点 ID
 * 用于展开全部操作
 *
 * @param nodes - 菜单树节点数组
 * @returns 所有有子节点的节点 ID 数组
 */
export function collectParentNodeIds(nodes: MenuNode[]): string[] {
  const ids: string[] = [];

  function traverse(nodes: MenuNode[]) {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        ids.push(node.id);
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return ids;
}
