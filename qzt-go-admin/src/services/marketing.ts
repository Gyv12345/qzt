import request from '../utils/request'
import type { PageParams } from '../types'
import type {
  MarketingAccount,
  MarketingAccountPayload,
  MarketingLeadLog,
  MarketingSyncResult,
} from '../types/marketing'

/** 分页结构(list+total,与各模块一致) */
export interface PageResult<T> {
  list: T[]
  total: number
}

// ---------- 渠道账号 ----------

export const listAccounts = () =>
  request.get<unknown, PageResult<MarketingAccount>>('/marketing/accounts')

export const createAccount = (data: MarketingAccountPayload) =>
  request.post('/marketing/accounts', data)

export const updateAccount = (id: number, data: MarketingAccountPayload) =>
  request.put(`/marketing/accounts/${id}`, data)

export const deleteAccount = (id: number) => request.delete(`/marketing/accounts/${id}`)

/** 生成巨量授权链接(redirect_uri 由前端按当前后台域名推导) */
export const getAuthorizeUrl = (id: number, redirectUri: string) =>
  request.get<unknown, { url: string }>(`/marketing/accounts/${id}/authorize-url`, {
    params: { redirect_uri: redirectUri },
  })

/** 立即同步一次该账号的飞鱼线索(同步执行) */
export const syncAccount = (id: number) =>
  request.post<unknown, MarketingSyncResult>(`/marketing/accounts/${id}/sync`)

// ---------- 同步日志 ----------

export interface LogQuery extends PageParams {
  account_id?: number
  status?: number
  keyword?: string
  start_time?: string
  end_time?: string
}

export const listLogs = (params?: LogQuery) =>
  request.get<unknown, PageResult<MarketingLeadLog>>('/marketing/logs', { params })

export const getLog = (id: number) =>
  request.get<unknown, { log: MarketingLeadLog; raw: string }>(`/marketing/logs/${id}`)
