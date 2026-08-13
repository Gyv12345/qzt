import request from '../utils/request'

export interface SysUserOption {
  id: number
  username: string
  nickname: string
  dept_id?: number
}

/** 系统用户列表(分页,支持 keyword 搜索姓名/用户名) */
export const listUsers = (params: { page: number; page_size: number; keyword?: string }) =>
  request.get<unknown, { list: SysUserOption[]; total: number }>('/system/users', { params })
