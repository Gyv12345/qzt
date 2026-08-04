// API 契约类型,与 qzt-go-server swagger 定义保持一致

/** 统一响应信封 */
export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
  timestamp: number
}

/** 分页结果 */
export interface PageResult<T> {
  list: T[]
  page: number
  size: number
  total: number
}

export interface PageParams {
  page?: number
  page_size?: number
}

/** 登录响应 */
export interface LoginResult {
  access_token: string
  refresh_token: string
  /** access token 过期时间(unix 秒) */
  access_expire: number
  user_id: number
  username: string
  nickname: string
}

export interface SysAPI {
  id: number
  path: string
  method: string
  group: string
  description: string
  created_at: string
  updated_at: string
}

export interface SysRole {
  id: number
  name: string
  code: string
  sort: number
  status: number
  remark: string
  menus?: SysMenu[]
  created_at: string
  updated_at: string
}

export interface SysUser {
  id: number
  username: string
  nickname: string
  avatar: string
  email: string
  phone: string
  status: number
  roles?: SysRole[]
  created_at: string
  updated_at: string
}

/** 菜单类型: 0=目录 1=菜单 2=按钮 */
export type MenuType = 0 | 1 | 2

export interface SysMenu {
  id: number
  parent_id: number
  name: string
  path: string
  component: string
  icon: string
  sort: number
  type: MenuType
  permission: string
  /** 1=显示 0=隐藏 */
  visible: number
  /** 1=启用 0=停用 */
  status: number
  apis?: SysAPI[]
  children?: SysMenu[]
  created_at?: string
  updated_at?: string
}

export interface SysDictItem {
  id: number
  dict_id: number
  label: string
  value: string
  sort: number
  status: number
  remark: string
  created_at?: string
  updated_at?: string
}

export interface SysDict {
  id: number
  name: string
  code: string
  sort: number
  status: number
  remark: string
  items?: SysDictItem[]
  created_at: string
  updated_at: string
}
