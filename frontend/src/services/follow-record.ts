import { request } from '@umijs/max';

export interface FollowRecord {
  id: string;
  customerId: string;
  content: string;
  type?: number;
  nextTime?: Date;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
  };
}

export interface CreateFollowRecordParams {
  customerId: string;
  content: string;
  type?: number;
  nextTime?: Date;
}

/**
 * 获取客户的跟进记录列表
 */
export async function getFollowRecords(customerId: string): Promise<FollowRecord[]> {
  return request<FollowRecord[]>(`/api/follow-records/customer/${customerId}`, {
    method: 'GET',
  });
}

/**
 * 创建跟进记录
 */
export async function createFollowRecord(
  data: CreateFollowRecordParams,
): Promise<FollowRecord> {
  return request<FollowRecord>('/api/follow-records', {
    method: 'POST',
    data,
  });
}

/**
 * 删除跟进记录
 */
export async function deleteFollowRecord(id: string): Promise<void> {
  return request(`/api/follow-records/${id}`, {
    method: 'DELETE',
  });
}
