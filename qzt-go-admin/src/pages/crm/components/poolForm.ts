import type { TreeSelectProps } from 'antd'
import type { HrmDepartment } from '../../../types/hrm'

/** 容错解析 "[1,2]" 形式的 JSON 数组字符串为数字 ID 数组(公海池配置回填用) */
export const parseIdArray = (json?: string): number[] => {
  if (!json) return []
  try {
    const arr: unknown = JSON.parse(json)
    return Array.isArray(arr)
      ? arr.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0)
      : []
  } catch {
    return []
  }
}

/** 部门树 → TreeSelect data(公海池表单用) */
export function deptToTreeData(depts: HrmDepartment[]): TreeSelectProps['treeData'] {
  return depts.map((d) => ({
    title: d.name,
    value: d.id,
    children: d.children?.length ? deptToTreeData(d.children) : undefined,
  }))
}
