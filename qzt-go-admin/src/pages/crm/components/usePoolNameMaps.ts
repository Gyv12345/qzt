import { useEffect, useState } from 'react'
import { getDepartmentTree } from '../../../services/hrm'
import { listAllRoles } from '../../../services/system'
import { useUserStore } from '../../../stores/users'
import type { HrmDepartment } from '../../../types/hrm'
import type { SysRole } from '../../../types'

/** 部门树扁平化为 id -> name */
function flattenDepts(nodes: HrmDepartment[], acc: Map<number, string> = new Map()) {
  nodes.forEach((n) => {
    acc.set(n.id, n.name)
    if (n.children?.length) flattenDepts(n.children, acc)
  })
  return acc
}

/**
 * 公海池/线索池列表「适用范围/管理员」列的 ID → 名称翻译。
 * 用户名走全局 user store(登录后 router 层已拉取),部门/角色各拉一次。
 */
export function usePoolNameMaps() {
  const nickname = useUserStore((s) => s.nickname)
  const [deptMap, setDeptMap] = useState<Map<number, string>>(() => new Map())
  const [roleMap, setRoleMap] = useState<Map<number, string>>(() => new Map())

  useEffect(() => {
    getDepartmentTree()
      .then((tree) => setDeptMap(flattenDepts(tree)))
      .catch(() => {})
    listAllRoles()
      .then((roles: SysRole[]) => setRoleMap(new Map(roles.map((r) => [r.id, r.name]))))
      .catch(() => {})
  }, [])

  const deptName = (id: number) => deptMap.get(id) ?? `部门#${id}`
  const roleName = (id: number) => roleMap.get(id) ?? `角色#${id}`
  return { deptName, roleName, userName: nickname }
}
