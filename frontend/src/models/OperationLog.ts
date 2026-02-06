/**
 * 操作日志类型定义
 */
export type OperationLog = {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  detail?: string;
  createdAt: string;
};
