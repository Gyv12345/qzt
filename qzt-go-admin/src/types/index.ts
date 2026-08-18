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
  /** 数据权限范围 1全部 3本部门 4本部门及子部门 5仅本人 */
  data_scope: number
  remark: string
  menus?: SysMenu[]
  created_at: string
  updated_at: string
}

export interface SysUser {
  id: number
  username: string
  nickname: string
  /** 部门ID(关联hrm_department) */
  dept_id: number | null
  avatar: string
  email: string
  phone: string
  status: number
  /** 已绑定的企业微信 UserID,未绑定为空 */
  wecom_user_id?: string
  roles?: SysRole[]
  /** 关联员工档案(GetProfile 返回) */
  employee?: EmployeeBrief | null
  created_at: string
  updated_at: string
}

/** 用户简表(GET /system/users/options,仅登录无 RBAC,不含邮箱/手机等敏感字段) */
export interface UserOption {
  id: number
  username: string
  nickname: string
  dept_id: number | null
}

/** 员工简要信息(GetProfile 附带) */
export interface EmployeeBrief {
  emp_no: string
  name: string
  dept_name: string
  pos_name: string
  entry_date: string
  status: number
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

export interface SysConfig {
  id: number
  name: string
  key: string
  value: string
  type: string
  group: string
  options: string
  is_public: boolean
  builtin: boolean
  editable: boolean
  sort: number
  remark: string
  created_at: string
  updated_at: string
}

export interface SysOperationLog {
  id: number
  trace_id: string
  user_id: number
  username: string
  role_codes: string
  module: string
  action: string
  method: string
  route: string
  path: string
  target_id: string
  req_params: string
  resp_params: string
  status: number
  biz_code: number
  success: boolean
  error_msg: string
  client_ip: string
  /** IP 归属地(后端查询时解析填充) */
  region: string
  user_agent: string
  latency_ms: number
  created_at: string
  updated_at: string
}

/** 登录日志 */
export interface SysLoginLog {
  id: number
  user_id: number
  username: string
  action: string
  success: boolean
  error_msg: string
  client_ip: string
  /** IP 归属地(后端查询时解析填充) */
  region: string
  user_agent: string
  created_at: string
}

// ---------- 请求体 ----------

/** API Key */
export interface SysApiKey {
  id: number
  user_id: number
  name: string
  key_prefix: string
  /** 可用 MCP 工具集(空数组 = 不限制,暴露全部工具) */
  toolsets: string[]
  /** 最后使用时间,null 表示从未使用 */
  last_used_at: string | null
  last_used_ip: string
  /** 过期时间,null 表示永不过期 */
  expires_at: string | null
  /** 1 启用 0 禁用 */
  status: number
  created_at: string
}

/** MCP 工具集目录项(后台勾选 UI 数据源) */
export interface McpToolset {
  key: string
  name: string
  prefixes: string[]
  tool_count: number
}

/** 创建 API Key 响应(明文密钥仅此一次返回) */
export interface CreateApiKeyResult extends SysApiKey {
  api_key: string
}

export interface UpdateProfileRequest {
  nickname?: string
  avatar?: string
  email?: string
  phone?: string
}

export interface ChangePasswordRequest {
  old_password: string
  /** 最少 6 位 */
  new_password: string
}

export interface CreateUserRequest {
  username: string
  nickname: string
  password: string
  dept_id?: number | null
  email?: string
  phone?: string
  status: number
  role_ids?: number[]
}

export interface UpdateUserRequest {
  nickname?: string
  dept_id?: number | null
  password?: string
  avatar?: string
  email?: string
  phone?: string
  status?: number
  role_ids?: number[]
}

export interface CreateRoleRequest {
  name: string
  code: string
  sort: number
  status: number
  data_scope: number
  remark?: string
}

export interface UpdateRoleRequest {
  name?: string
  sort?: number
  status?: number
  data_scope?: number
  remark?: string
}

export interface MenuPayload {
  parent_id: number
  name: string
  path?: string
  component?: string
  icon?: string
  sort: number
  type: MenuType
  permission?: string
  visible: number
  status: number
  api_ids?: number[]
}

export interface ApiPayload {
  path: string
  method: string
  group: string
  description?: string
}

export interface DictItemPayload {
  label: string
  value: string
  sort: number
  status: number
  remark?: string
}

export interface DictPayload {
  name: string
  code: string
  sort?: number
  status: number
  remark?: string
  items?: DictItemPayload[]
}

export interface CreateConfigRequest {
  name: string
  key: string
  value?: string
  type?: string
  group?: string
  options?: string
  is_public?: boolean
  sort?: number
  remark?: string
}

export interface UpdateConfigRequest {
  name?: string
  value?: string
  type?: string
  group?: string
  options?: string
  is_public?: boolean
  sort?: number
  remark?: string
}

export interface OperationLogQuery extends PageParams {
  username?: string
  module?: string
  client_ip?: string
  success?: string
  keyword?: string
  start_time?: string
  end_time?: string
}

export interface LoginLogQuery extends PageParams {
  username?: string
  success?: string
  client_ip?: string
}

// ---------- 第三方登录配置 ----------

export interface SysOauthConfig {
  id: number
  /** 提供方,如 wecom */
  provider: string
  name: string
  app_id: string
  agent_id: string
  app_secret?: string
  redirect_uri: string
  extra: string
  sort: number
  /** 1 启用 0 禁用 */
  enabled?: number
  remark: string
  created_at: string
  updated_at: string
}

export interface OauthConfigPayload {
  provider: string
  name?: string
  app_id?: string
  agent_id?: string
  app_secret?: string
  redirect_uri?: string
  extra?: string
  sort?: number
  remark?: string
}

// ---------- 站点信息(网站基础元数据) ----------

export interface SysSiteConfig {
  id: number
  site_name: string
  logo_url: string
  favicon_url: string
  slogan: string
  description: string
  contact_phone: string
  contact_email: string
  contact_address: string
  contact_qq: string
  contact_wechat: string
  work_hours: string
  weibo_url: string
  wechat_qr_url: string
  linkedin_url: string
  icp_beian: string
  public_security_beian: string
  public_security_beian_url: string
  keywords: string
  analytics_code: string
  copyright: string
  mcp_url: string
  created_at: string
  updated_at: string
}

export interface UpdateSiteConfigRequest {
  site_name?: string
  logo_url?: string
  favicon_url?: string
  slogan?: string
  description?: string
  contact_phone?: string
  contact_email?: string
  contact_address?: string
  contact_qq?: string
  contact_wechat?: string
  work_hours?: string
  weibo_url?: string
  wechat_qr_url?: string
  linkedin_url?: string
  icp_beian?: string
  public_security_beian?: string
  public_security_beian_url?: string
  keywords?: string
  analytics_code?: string
  copyright?: string
  mcp_url?: string
}

// ---------- 首页板块配置 ----------

export interface HomepageFeature {
  id: number
  module: string
  item_id: number
  sort: number
  item_name: string
  sub_info: string
}

export interface HomepageModule {
  id: number
  module: string
  module_name: string
  enabled: boolean
  sort: number
  features: HomepageFeature[]
}
