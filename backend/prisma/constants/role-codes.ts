/**
 * 角色代码常量
 * 
 * 这是唯一的角色代码定义源，供以下地方使用：
 * - src/common/constants/role-codes.ts（运行时代码）
 * - prisma/seed.*.ts（数据库初始化脚本）
 * 
 * ⚠️ 不要在其他地方重复定义角色代码！
 */
export const RoleCodes = {
  /** 超级管理员 - 拥有所有权限 */
  SUPER_ADMIN: 'super_admin',
  
  /** 管理员 - 拥有大部分管理权限 */
  ADMIN: 'admin',
  
  /** 普通用户 - 基础权限 */
  USER: 'user',
} as const;

/** 角色代码类型 */
export type RoleCode = typeof RoleCodes[keyof typeof RoleCodes];

/**
 * 判断是否为管理员角色
 */
export function isAdminRole(roleCode: string): boolean {
  return roleCode === RoleCodes.SUPER_ADMIN || roleCode === RoleCodes.ADMIN;
}

/**
 * 管理员角色代码列表
 */
export const ADMIN_ROLE_CODES = [RoleCodes.SUPER_ADMIN, RoleCodes.ADMIN] as const;

/**
 * 角色默认数据
 * 用于数据库初始化
 */
export const DEFAULT_ROLES = [
  {
    name: '超级管理员',
    code: RoleCodes.SUPER_ADMIN,
    description: '拥有系统所有权限',
    type: 'system' as const,
    dataScope: 'all' as const,
    status: 'ACTIVE' as const,
  },
  {
    name: '管理员',
    code: RoleCodes.ADMIN,
    description: '拥有大部分管理权限',
    type: 'system' as const,
    dataScope: 'department' as const,
    status: 'ACTIVE' as const,
  },
  {
    name: '普通用户',
    code: RoleCodes.USER,
    description: '基础用户权限',
    type: 'system' as const,
    dataScope: 'self' as const,
    status: 'ACTIVE' as const,
  },
] as const;
