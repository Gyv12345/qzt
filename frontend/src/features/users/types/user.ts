import { z } from 'zod'

// 用户状态
export const userStatusSchema = z.union([
  z.literal(0), // 禁用
  z.literal(1), // 启用
])
export type UserStatus = z.infer<typeof userStatusSchema>

// 用户 Schema
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  departmentId: z.string().optional(),
  departmentName: z.string().optional(),
  status: userStatusSchema,
  roles: z.array(z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
  })).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type User = z.infer<typeof userSchema>

// 用户列表响应
export interface UserListResponse {
  items: User[]
  total: number
  page: number
  pageSize: number
}
