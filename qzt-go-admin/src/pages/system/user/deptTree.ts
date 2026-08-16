import type { DataNode } from 'antd/es/tree'
import type { TreeSelectProps } from 'antd'
import type { HrmDepartment } from '../../../types/hrm'

/** 全部部门根节点的 key(用一个负数避免与真实部门 id 冲突) */
export const ALL_DEPT_KEY = -1
/** 「未分配部门」虚拟节点 key */
export const NONE_DEPT_KEY = -2

/** 部门树 → TreeSelect data(表单用) */
export function deptToTreeData(depts: HrmDepartment[]): TreeSelectProps['treeData'] {
  return depts.map((d) => ({
    title: d.name,
    value: d.id,
    children: d.children?.length ? deptToTreeData(d.children) : undefined,
  }))
}

/** 部门树 → antd Tree DataNode(左侧面板用),含「全部」「未分配」虚拟节点 */
export function deptToTreeNodes(depts: HrmDepartment[]): DataNode[] {
  const build = (list: HrmDepartment[]): DataNode[] =>
    list.map((d) => ({
      title: d.name,
      key: d.id,
      children: d.children?.length ? build(d.children) : undefined,
    }))
  return [
    { title: '全部部门', key: ALL_DEPT_KEY, children: build(depts) },
    { title: '未分配部门', key: NONE_DEPT_KEY },
  ]
}

/** 递归收集部门及其所有子部门 id(含自身) */
export function collectDeptAndSub(depts: HrmDepartment[], id: number): Set<number> {
  const result = new Set<number>()
  const walk = (list: HrmDepartment[]) => {
    for (const d of list) {
      if (d.id === id) {
        result.add(d.id)
        collectInto(d.children, result)
        return
      }
      if (d.children?.length) walk(d.children)
    }
  }
  const collectInto = (list: HrmDepartment[] | undefined, into: Set<number>) => {
    if (!list) return
    for (const d of list) {
      into.add(d.id)
      collectInto(d.children, into)
    }
  }
  walk(depts)
  return result
}
