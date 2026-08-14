import type { PageGuide } from './types'
import { globalGuide } from './global'
import { customerGuide } from './crm'
import { purchaseOrderGuide } from './psi'
import { tripGuide } from './oa'
import { employeeGuide } from './hrm'

/**
 * 全部向导注册表:key 为页面在 usePageGuide() 里声明的 guideKey。
 * 新页面接入:在 guides/<模块>.ts 补充定义并注册到这里。
 */
export const pageGuides: Record<string, PageGuide> = {
  [globalGuide.key]: globalGuide,
  [customerGuide.key]: customerGuide,
  [purchaseOrderGuide.key]: purchaseOrderGuide,
  [tripGuide.key]: tripGuide,
  [employeeGuide.key]: employeeGuide,
}

export type { PageGuide, GuideStep, HelpSection } from './types'
