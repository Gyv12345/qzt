import request from '../utils/request'
import type { CreateFollowRecordPayload, FollowUpRecord } from '../types/crm'

/** 创建跟进记录(至少传 customer_id 或 lead_id 之一;follow_time 格式 YYYY-MM-DD HH:mm:ss) */
export const createFollowRecord = (data: CreateFollowRecordPayload) =>
  request.post('/crm/follow-records', data)

/** 查某资源的跟进记录时间线(field: customer_id / lead_id / opportunity_id / contract_id / contact_id) */
export const listFollowTimeline = (field: string, value: number) =>
  request.get<unknown, FollowUpRecord[]>('/crm/follow-records/timeline', {
    params: { field, value },
  })
