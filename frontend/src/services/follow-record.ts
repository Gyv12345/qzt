import { request } from '@/lib/api-client';
import type {
  FollowRecord,
  CreateFollowRecordRequest,
} from '@/types';

// 获取客户的跟进记录列表
export const getFollowRecords = async (customerId: string) => {
  const res = await request.get<FollowRecord[]>(`/follow-records/customer/${customerId}`);
  return res.data;
};

// 创建跟进记录
export const createFollowRecord = (data: CreateFollowRecordRequest) => {
  return request.post<FollowRecord>('/follow-records', data);
};

// 删除跟进记录
export const deleteFollowRecord = (id: string) => {
  return request.delete(`/follow-records/${id}`);
};
