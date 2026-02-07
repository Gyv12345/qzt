/**
 * 登录日志类型定义
 */
export type LoginLog = {
  id: string;
  userId: string;
  username: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  status: "SUCCESS" | "FAILED";
  failReason?: string;
  createdAt: string;
};
