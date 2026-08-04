import type { ReactNode } from 'react'
import { useAuthStore } from '../stores/auth'

/** 按钮/功能级权限判断 */
export function usePerm() {
  return useAuthStore((s) => s.hasPerm)
}

/** 按权限码渲染子元素,无权限则不渲染 */
export default function Auth({ perm, children }: { perm: string; children: ReactNode }) {
  const hasPerm = usePerm()
  if (!hasPerm(perm)) return null
  return <>{children}</>
}
