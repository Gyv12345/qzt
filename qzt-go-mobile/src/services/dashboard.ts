import request from '../utils/request'
import type { DashboardOverview } from '../types/dashboard'

/** 首页核心指标 */
export const getDashboardOverview = () =>
  request.get<unknown, DashboardOverview>('/api/dashboard/overview')
