import request from '../utils/request'

export interface SysUserOption {
  id: number
  username: string
  nickname: string
  dept_id?: number
}

/** 用户简表选项(登录即可用):站内信收件人、转移负责人等选人场景,支持 keyword 搜索 */
export const listUsers = (params: { keyword?: string; limit?: number }) =>
  request.get<unknown, { list: SysUserOption[] }>('/system/users/options', { params })
