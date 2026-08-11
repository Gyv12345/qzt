import request from '../utils/request'
import type {
  ApiPayload,
  CreateConfigRequest,
  CreateRoleRequest,
  CreateUserRequest,
  DictPayload,
  HomepageModule,
  LoginLogQuery,
  MenuPayload,
  OauthConfigPayload,
  OperationLogQuery,
  PageParams,
  PageResult,
  SysAPI,
  SysConfig,
  SysDict,
  SysLoginLog,
  SysMenu,
  SysOauthConfig,
  SysOperationLog,
  SysRole,
  SysSiteConfig,
  SysUser,
  UpdateConfigRequest,
  UpdateRoleRequest,
  UpdateSiteConfigRequest,
  UpdateUserRequest,
} from '../types'

// ---------- 用户管理 ----------

export const listUsers = (params?: PageParams) =>
  request.get<unknown, PageResult<SysUser>>('/system/users', { params })

// listAllUsers 循环分页拉取全部用户(后端 page_size 上限 100)。
// 供用户管理页左侧部门树前端过滤使用,用户量通常不大。
export const listAllUsers = async (): Promise<SysUser[]> => {
  const pageSize = 100
  let page = 1
  const all: SysUser[] = []
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await listUsers({ page, page_size: pageSize })
    all.push(...res.list)
    if (all.length >= res.total || res.list.length === 0) break
    page++
  }
  return all
}

export const createUser = (data: CreateUserRequest) => request.post('/system/users', data)

export const updateUser = (id: number, data: UpdateUserRequest) =>
  request.put(`/system/users/${id}`, data)

export const deleteUser = (id: number) => request.delete(`/system/users/${id}`)

// ---------- 角色管理 ----------

export const listRoles = (params?: PageParams) =>
  request.get<unknown, PageResult<SysRole>>('/system/roles', { params })

export const listAllRoles = () => request.get<unknown, SysRole[]>('/system/roles/all')

export const getRole = (id: number) => request.get<unknown, SysRole>(`/system/roles/${id}`)

export const createRole = (data: CreateRoleRequest) => request.post('/system/roles', data)

export const updateRole = (id: number, data: UpdateRoleRequest) =>
  request.put(`/system/roles/${id}`, data)

export const deleteRole = (id: number) => request.delete(`/system/roles/${id}`)

export const setRoleMenus = (id: number, menuIds: number[]) =>
  request.put(`/system/roles/${id}/menus`, { menu_ids: menuIds })

// ---------- 菜单管理 ----------

export const getMenuTree = () => request.get<unknown, SysMenu[]>('/system/menus/tree')

export const createMenu = (data: MenuPayload) => request.post('/system/menus', data)

export const updateMenu = (id: number, data: MenuPayload) =>
  request.put(`/system/menus/${id}`, data)

export const deleteMenu = (id: number) => request.delete(`/system/menus/${id}`)

// ---------- API 管理 ----------

export const listApis = (params?: PageParams) =>
  request.get<unknown, PageResult<SysAPI>>('/system/apis', { params })

export const listAllApis = () => request.get<unknown, SysAPI[]>('/system/apis/all')

export const createApi = (data: ApiPayload) => request.post('/system/apis', data)

export const updateApi = (id: number, data: ApiPayload) => request.put(`/system/apis/${id}`, data)

export const deleteApi = (id: number) => request.delete(`/system/apis/${id}`)

// ---------- 字典管理 ----------

export const listDicts = (params?: PageParams & { keyword?: string }) =>
  request.get<unknown, PageResult<SysDict>>('/system/dicts', { params })

export const listAllDicts = () => request.get<unknown, SysDict[]>('/system/dicts/all')

export const createDict = (data: DictPayload) => request.post('/system/dicts', data)

export const updateDict = (id: number, data: DictPayload) =>
  request.put(`/system/dicts/${id}`, data)

export const deleteDict = (id: number) => request.delete(`/system/dicts/${id}`)

// ---------- 系统配置 ----------

export const listConfigs = (group?: string) =>
  request.get<unknown, SysConfig[]>('/system/configs', { params: group ? { group } : {} })

export const createConfig = (data: CreateConfigRequest) => request.post('/system/configs', data)

export const updateConfig = (id: number, data: UpdateConfigRequest) =>
  request.put(`/system/configs/${id}`, data)

export const deleteConfig = (id: number) => request.delete(`/system/configs/${id}`)

export const batchUpdateConfigs = (items: { key: string; value: string }[]) =>
  request.put('/system/configs', { items })

export const refreshConfigCache = () => request.post('/system/configs/refresh')

// ---------- 操作日志 ----------

export const listOperationLogs = (params?: OperationLogQuery) =>
  request.get<unknown, PageResult<SysOperationLog>>('/system/operation-logs', { params })

export const deleteOperationLog = (id: number) => request.delete(`/system/operation-logs/${id}`)

export const clearOperationLogs = () => request.delete('/system/operation-logs')

// ---------- 登录日志 ----------

export const listLoginLogs = (params?: LoginLogQuery) =>
  request.get<unknown, PageResult<SysLoginLog>>('/system/login-logs', { params })

// ---------- 数据重置(危险操作) ----------

/** 一键清理业务数据:清空客户/线索/商机/合同/跟进/员工/凭证/进销存等,系统配置不受影响 */
export const resetBusinessData = (confirm: string) =>
  request.post('/system/reset', { confirm })

// ---------- 第三方登录配置 ----------

export const listOauthConfigs = () =>
  request.get<unknown, SysOauthConfig[]>('/system/oauth-configs')

export const createOauthConfig = (data: OauthConfigPayload) =>
  request.post('/system/oauth-configs', data)

export const updateOauthConfig = (id: number, data: OauthConfigPayload) =>
  request.put(`/system/oauth-configs/${id}`, data)

export const deleteOauthConfig = (id: number) => request.delete(`/system/oauth-configs/${id}`)

/** 启用/禁用第三方登录 */
export const setOauthConfigEnable = (id: number, enabled: number) =>
  request.put(`/system/oauth-configs/${id}/enable`, { enabled })

// ---------- 站点信息 ----------

export const getSiteConfig = () => request.get<unknown, SysSiteConfig>('/system/site-config')

export const updateSiteConfig = (data: UpdateSiteConfigRequest) =>
  request.put('/system/site-config', data)

// ---------- 首页板块配置 ----------

export const getHomepageConfig = () =>
  request.get<unknown, { list: HomepageModule[] }>('/system/homepage-config')

export const toggleHomepageModule = (module: string, enabled: boolean) =>
  request.put('/system/homepage-config/toggle', { module, enabled })

export const syncHomepageFeatures = (module: string, itemIds: number[]) =>
  request.put('/system/homepage-config/sync', { module, item_ids: itemIds })

export const removeHomepageFeature = (id: number) =>
  request.delete(`/system/homepage-config/features/${id}`)
