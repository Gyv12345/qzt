/**
 * 角色代码常量
 * 
 * ⚠️ 这个文件只是 re-export，真正的定义在 prisma/constants/role-codes.ts
 * 这样做是为了让代码和数据库初始化脚本共享同一个常量源
 */

// 从 prisma 常量目录导入（单一数据源）
export {
  RoleCodes,
  type RoleCode,
  isAdminRole,
  ADMIN_ROLE_CODES,
  DEFAULT_ROLES,
} from '../../../prisma/constants/role-codes';
