import request from '../utils/request'
import type { SendMailRequest } from '../types'

/** 发送邮件 */
export const sendMail = (data: SendMailRequest) =>
  request.post<unknown, unknown>('/mail/send', data)

/** 测试 SMTP 连接(给 mail.from 自身发测试邮件) */
export const testMailConnect = () =>
  request.post<unknown, { msg: string }>('/mail/test')
