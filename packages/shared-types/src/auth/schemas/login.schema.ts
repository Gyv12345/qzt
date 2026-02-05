import { z } from 'zod'

/**
 * 登录请求 Schema
 */
export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
})

export type Login = z.infer<typeof loginSchema>

/**
 * 登录角色 Schema
 */
export const loginRoleSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  code: z.string(),
})

export type LoginRole = z.infer<typeof loginRoleSchema>

/**
 * 登录用户 Schema
 */
export const loginUserSchema = z.object({
  id: z.string().cuid(),
  username: z.string(),
  name: z.string(),
  email: z.string().email('请输入有效的邮箱地址').optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  roles: z.array(loginRoleSchema),
})

export type LoginUser = z.infer<typeof loginUserSchema>

/**
 * 登录响应 Schema
 */
export const loginResponseSchema = z.object({
  access_token: z.string(),
  user: loginUserSchema,
})

export type LoginResponse = z.infer<typeof loginResponseSchema>
