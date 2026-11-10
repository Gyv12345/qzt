import request from '../utils/request'
import type { PageParams } from '../types'
import type {
  GeoDouyinAccount,
  GeoPipelineResult,
  GeoPlatform,
  GeoPlatformPayload,
  GeoPrompt,
  GeoPromptPayload,
  GeoResultRow,
  GeoRun,
  GeoSource,
  GeoSourcePayload,
  GeoTopic,
  GeoTopicPayload,
  RunStartResult,
} from '../types/geo'
import type { PageResult } from './marketing'

/** GEO 监测看板 API(后端模块前缀 /geo) */

// ---------- 提示词库 ----------

export const listPrompts = (params?: PageParams & { group_type?: string; keyword?: string }) =>
  request.get<unknown, PageResult<GeoPrompt>>('/geo/prompts', { params })

export const createPrompt = (data: GeoPromptPayload) => request.post('/geo/prompts', data)

export const updatePrompt = (id: number, data: GeoPromptPayload) =>
  request.put(`/geo/prompts/${id}`, data)

export const deletePrompt = (id: number) => request.delete(`/geo/prompts/${id}`)

// ---------- 监测平台 ----------

export const listPlatforms = () =>
  request.get<unknown, PageResult<GeoPlatform>>('/geo/platforms')

export const createPlatform = (data: GeoPlatformPayload) => request.post('/geo/platforms', data)

/** api_key 留空保留原值 */
export const updatePlatform = (id: number, data: GeoPlatformPayload) =>
  request.put(`/geo/platforms/${id}`, data)

export const deletePlatform = (id: number) => request.delete(`/geo/platforms/${id}`)

// ---------- 监测轮次 ----------

export const startRun = () => request.post<unknown, RunStartResult>('/geo/runs')

export const listRuns = (params?: PageParams) =>
  request.get<unknown, PageResult<GeoRun>>('/geo/runs', { params })

export const listResults = (runId: number) =>
  request.get<unknown, PageResult<GeoResultRow>>(`/geo/runs/${runId}/results`)

/** 最近 N 轮指标趋势(已完成轮次,新在前) */
export const getGeoTrend = (limit = 12) =>
  request.get<unknown, GeoRun[]>('/geo/trend', { params: { limit } })

/** 导出一轮明细 CSV(axios blob 透传,前端触发浏览器下载) */
export const exportRun = async (id: number) => {
  const blob = await request.get<unknown, Blob>(`/geo/runs/${id}/export`, { responseType: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `geo_run_${id}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------- 信源产线:选题池 ----------

export const listTopics = (params?: PageParams & { status?: string; origin?: string }) =>
  request.get<unknown, PageResult<GeoTopic>>('/geo/topics', { params })

export const createTopic = (data: GeoTopicPayload) => request.post('/geo/topics', data)

export const updateTopic = (id: number, data: GeoTopicPayload) =>
  request.put(`/geo/topics/${id}`, data)

export const deleteTopic = (id: number) => request.delete(`/geo/topics/${id}`)

export const reviewTopic = (id: number, approve: boolean) =>
  request.post(`/geo/topics/${id}/review`, { approve })

/** AI 生成选题(读最近监测结果),返回入库条数 */
export const generateTopics = () =>
  request.post<unknown, { inserted: number }>('/geo/topics/generate')

// ---------- 信源产线:稿件库 ----------

export const listSources = (
  params?: PageParams & { content_type?: string; platform?: string; status?: string; qc_status?: string },
) => request.get<unknown, PageResult<GeoSource>>('/geo/sources', { params })

export const createSource = (data: GeoSourcePayload) => request.post('/geo/sources', data)

export const updateSource = (id: number, data: GeoSourcePayload) =>
  request.put(`/geo/sources/${id}`, data)

export const deleteSource = (id: number) => request.delete(`/geo/sources/${id}`)

/** P18 手动质检稿件（AI 分维度评分，不达标阻断推送） */
export const qcSource = (id: number) =>
  request.post<unknown, { qc_status: string; qc_result: string; skipped?: boolean; message?: string }>(
    `/geo/sources/${id}/qc`,
  )

/** 推送公众号草稿箱 */
export const pushSource = (id: number) => request.post<unknown, GeoSource>(`/geo/sources/${id}/push`)

/** API 直接发布(freepublish,仅认证账号) */
export const publishSource = (id: number) =>
  request.post<unknown, GeoSource>(`/geo/sources/${id}/publish`)

/** 拉取发布状态(成功回填 publish_url) */
export const refreshPublish = (id: number) =>
  request.get<unknown, GeoSource>(`/geo/sources/${id}/publish`)

/** 视频直发抖音 */
export const pushSourceDouyin = (id: number) =>
  request.post<unknown, GeoSource>(`/geo/sources/${id}/douyin`)

/** 生成分发稿(母稿 ID + 目标平台) */
export const createVariant = (id: number, platform: string) =>
  request.post<unknown, GeoSource>(`/geo/sources/${id}/variants`, { platform })

/** 手动产稿(留空自动领取选题) */
export const generateSource = (topicId?: number) =>
  request.post<unknown, GeoSource>('/geo/sources/generate', topicId ? { topic_id: topicId } : {})

/** 立即跑一轮产线(选题→图文+视频→投递,耗时数分钟) */
export const runPipeline = () => request.post<unknown, GeoPipelineResult>('/geo/sources/run')

// ---------- 信源产线:抖音账号 ----------

export const getDouyinAuthorizeURL = () =>
  request.get<unknown, { url: string }>('/geo/platforms/douyin/authorize')

export const bindDouyin = (code: string) =>
  request.post<unknown, GeoDouyinAccount>('/geo/platforms/douyin/bind', { code })

export const listDouyinAccounts = () =>
  request.get<unknown, PageResult<GeoDouyinAccount>>('/geo/platforms/douyin/accounts')

export const deleteDouyinAccount = (id: number) =>
  request.delete(`/geo/platforms/douyin/accounts/${id}`)
