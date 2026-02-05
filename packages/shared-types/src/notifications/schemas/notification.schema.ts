import { z } from 'zod'

/**
 * 通知类型枚举
 */
export const notificationTypeSchema = z.enum(['SYSTEM', 'REMINDER', 'ALERT', 'MESSAGE'], {
  errorMap: () => ({ message: '通知类型必须是 SYSTEM、REMINDER、ALERT 或 MESSAGE' }),
})

export type NotificationType = z.infer<typeof notificationTypeSchema>

/**
 * 通知状态枚举
 */
export const notificationStatusSchema = z.enum(['UNREAD', 'READ', 'ARCHIVED'], {
  errorMap: () => ({ message: '通知状态必须是 UNREAD、READ 或 ARCHIVED' }),
})

export type NotificationStatus = z.infer<typeof notificationStatusSchema>

/**
 * 通知 Schema
 */
export const notificationSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  type: notificationTypeSchema,
  title: z.string(),
  content: z.string().optional(),
  status: notificationStatusSchema.default('UNREAD'),
  link: z.string().optional(),
  createdAt: z.coerce.date(),
  readAt: z.coerce.date().optional(),
})

export type Notification = z.infer<typeof notificationSchema>

/**
 * 创建通知 Schema
 */
export const createNotificationSchema = z.object({
  userId: z.string().cuid(),
  type: notificationTypeSchema,
  title: z.string().min(1, '标题不能为空'),
  content: z.string().optional(),
  link: z.string().optional(),
})

export type CreateNotification = z.infer<typeof createNotificationSchema>

/**
 * 批量标记已读 Schema
 */
export const markAsReadSchema = z.object({
  notificationIds: z.array(z.string().cuid()),
})

export type MarkAsRead = z.infer<typeof markAsReadSchema>

/**
 * 通知类型映射（用于显示）
 */
export const notificationTypeMap: Record<NotificationType, string> = {
  SYSTEM: '系统通知',
  REMINDER: '提醒',
  ALERT: '警告',
  MESSAGE: '消息',
}

/**
 * 通知状态映射（用于显示）
 */
export const notificationStatusMap: Record<NotificationStatus, string> = {
  UNREAD: '未读',
  READ: '已读',
  ARCHIVED: '已归档',
}

/**
 * 获取通知类型显示名称
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  return notificationTypeMap[type]
}

/**
 * 获取通知状态显示名称
 */
export function getNotificationStatusLabel(status: NotificationStatus): string {
  return notificationStatusMap[status]
}
