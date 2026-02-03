import { ReactNode } from 'react'

interface CommandMenuTriggerProps {
  children: ReactNode
}

export function CommandMenuTrigger({ children }: CommandMenuTriggerProps) {
  // CommandMenu 的打开状态管理将在根布局中实现
  return <>{children}</>
}
