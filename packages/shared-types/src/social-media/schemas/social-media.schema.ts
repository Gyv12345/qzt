import { z } from 'zod'

/**
 * 社交媒体平台枚举
 */
export const socialMediaPlatformSchema = z.enum(['DOUYIN', 'XIAOHONGSHU', 'WECHAT'], {
  message: '平台必须是 DOUYIN、XIAOHONGSHU 或 WECHAT',
})

export type SocialMediaPlatform = z.infer<typeof socialMediaPlatformSchema>

/**
 * 社交媒体账号状态枚举
 */
export const socialMediaAccountStatusSchema = z.enum(['ACTIVE', 'INACTIVE'], {
  message: '账号状态必须是 ACTIVE 或 INACTIVE',
})

export type SocialMediaAccountStatus = z.infer<typeof socialMediaAccountStatusSchema>

/**
 * 社交媒体帖子状态枚举
 */
export const socialMediaPostStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED'], {
  message: '帖子状态必须是 DRAFT、SCHEDULED、PUBLISHING、PUBLISHED 或 FAILED',
})

export type SocialMediaPostStatus = z.infer<typeof socialMediaPostStatusSchema>

/**
 * 可见性枚举
 */
export const visibilitySchema = z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE'], {
  message: '可见性必须是 PUBLIC、FRIENDS 或 PRIVATE',
})

export type Visibility = z.infer<typeof visibilitySchema>

/**
 * 社交媒体账号 Schema
 */
export const socialMediaAccountSchema = z.object({
  id: z.string().cuid(),
  platform: socialMediaPlatformSchema,
  accountName: z.string(),
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  accountId: z.string().optional(), // 平台账号ID
  openId: z.string().optional(),
  unionId: z.string().optional(),
  status: socialMediaAccountStatusSchema.default('ACTIVE'),
  expiresAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type SocialMediaAccount = z.infer<typeof socialMediaAccountSchema>

/**
 * 创建社交媒体账号 Schema
 */
export const createSocialMediaAccountSchema = z.object({
  platform: socialMediaPlatformSchema,
  accountName: z.string().min(1, '账号名称不能为空'),
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  accountId: z.string().optional(),
  openId: z.string().optional(),
  unionId: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
})

/**
 * 更新社交媒体账号 Schema
 */
export const updateSocialMediaAccountSchema = z.object({
  accountName: z.string().optional(),
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  status: socialMediaAccountStatusSchema.optional(),
  expiresAt: z.coerce.date().optional(),
})

/**
 * 社交媒体帖子 Schema
 */
export const socialMediaPostSchema = z.object({
  id: z.string().cuid(),
  accountId: z.string().cuid(),
  title: z.string(),
  content: z.string().optional(),
  videoFileId: z.string().optional(),
  coverFileId: z.string().optional(),
  videoUrl: z.string().optional(),
  coverUrl: z.string().optional(),
  topics: z.array(z.string()).optional(),
  location: z.string().optional(),
  visibility: visibilitySchema.default('PUBLIC'),
  status: socialMediaPostStatusSchema.default('DRAFT'),
  scheduledAt: z.coerce.date().optional(),
  publishedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type SocialMediaPost = z.infer<typeof socialMediaPostSchema>

/**
 * 创建社交媒体帖子 Schema
 */
export const createSocialMediaPostSchema = z.object({
  accountId: z.string().cuid('请选择有效的账号'),
  title: z.string().min(1, '标题不能为空'),
  content: z.string().optional(),
  videoFileId: z.string().optional(),
  coverFileId: z.string().optional(),
  videoUrl: z.string().optional(),
  coverUrl: z.string().optional(),
  topics: z.array(z.string()).optional(),
  location: z.string().optional(),
  visibility: visibilitySchema.optional(),
  scheduledAt: z.coerce.date().optional(),
})

/**
 * 更新社交媒体帖子 Schema
 */
export const updateSocialMediaPostSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  videoFileId: z.string().optional(),
  coverFileId: z.string().optional(),
  videoUrl: z.string().optional(),
  coverUrl: z.string().optional(),
  topics: z.array(z.string()).optional(),
  location: z.string().optional(),
  visibility: visibilitySchema.optional(),
  scheduledAt: z.coerce.date().optional(),
  status: socialMediaPostStatusSchema.optional(),
})

/**
 * 发布帖子 Schema
 */
export const publishSocialMediaPostSchema = z.object({
  id: z.string().cuid(),
  platforms: z.array(socialMediaPlatformSchema).optional(),
})

/**
 * 定时发布 Schema
 */
export const schedulePublishSchema = z.object({
  id: z.string().cuid(),
  scheduledAt: z.coerce.date(),
})

/**
 * 批量发布 Schema
 */
export const batchPublishSchema = z.object({
  ids: z.array(z.string().cuid()).min(1, '至少选择一个帖子'),
  platforms: z.array(socialMediaPlatformSchema).optional(),
})

/**
 * 刷新令牌 Schema
 */
export const refreshTokenSchema = z.object({
  id: z.string().cuid(),
})

/**
 * 平台映射（用于显示）
 */
export const socialMediaPlatformMap: Record<SocialMediaPlatform, string> = {
  DOUYIN: '抖音',
  XIAOHONGSHU: '小红书',
  WECHAT: '微信',
}

/**
 * 帖子状态映射（用于显示）
 */
export const socialMediaPostStatusMap: Record<SocialMediaPostStatus, string> = {
  DRAFT: '草稿',
  SCHEDULED: '已定时',
  PUBLISHING: '发布中',
  PUBLISHED: '已发布',
  FAILED: '发布失败',
}

/**
 * 可见性映射（用于显示）
 */
export const visibilityMap: Record<Visibility, string> = {
  PUBLIC: '公开',
  FRIENDS: '仅好友可见',
  PRIVATE: '私密',
}

/**
 * 获取平台显示名称
 */
export function getSocialMediaPlatformLabel(platform: SocialMediaPlatform): string {
  return socialMediaPlatformMap[platform]
}

/**
 * 获取帖子状态显示名称
 */
export function getSocialMediaPostStatusLabel(status: SocialMediaPostStatus): string {
  return socialMediaPostStatusMap[status]
}

/**
 * 获取可见性显示名称
 */
export function getVisibilityLabel(visibility: Visibility): string {
  return visibilityMap[visibility]
}
