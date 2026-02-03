/**
 * API 服务导出
 *
 * 使用示例:
 * ```typescript
 * import { getScrmApi } from '@/services'
 *
 * // 调用 API
 * const api = getScrmApi()
 * const result = await api.authControllerLogin({ username, password })
 * ```
 */

export { getScrmApi } from './api'
export { customInstance } from './mutator'

// 导出所有类型
export type * from './api'
export type * from '../models'

// 导出 hooks
export * from './customer'
export * from './contract'
export * from './invoice'
export * from './statistics'
export * from './serviceTeam'
