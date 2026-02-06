/**
 * 用户模块的 schema 定义
 */

export type UserStatus = "active" | "inactive" | "invited" | "suspended";

export interface UserSchema {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  status: UserStatus;
  departmentId?: string;
  roles?: string[];
  createdAt: string;
  updatedAt: string;
}
