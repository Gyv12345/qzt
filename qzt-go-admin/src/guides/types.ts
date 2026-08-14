import type { ReactNode } from 'react'

/** 单个 Tour 步骤:selector 定位页面元素(约定 [data-guide="xxx"]) */
export interface GuideStep {
  /** CSS 选择器,如 '[data-guide="add"]' */
  selector: string
  title: string
  description: ReactNode
}

/** 帮助弹窗中的一节 */
export interface HelpSection {
  title: string
  body: ReactNode
}

/** 一个页面(或全局)的完整向导定义 */
export interface PageGuide {
  /** 唯一 key,如 'crm.customer' / 'global' */
  key: string
  title: string
  /** 操作引导 Tour 步骤,空数组则该页只有帮助弹窗 */
  tour: GuideStep[]
  /** 页面帮助弹窗内容 */
  help: HelpSection[]
}
