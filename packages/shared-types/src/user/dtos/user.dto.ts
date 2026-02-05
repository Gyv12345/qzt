import { createZodDto } from '../../utils'
import {
  createUserSchema,
  updateUserSchema,
  queryUserSchema,
  resetPasswordSchema,
  userSchema,
} from '../schemas'

/**
 * 创建用户 DTO
 */
export class CreateUserDto extends createZodDto(createUserSchema) {}

/**
 * 更新用户 DTO
 */
export class UpdateUserDto extends createZodDto(updateUserSchema) {}

/**
 * 查询用户 DTO
 */
export class QueryUserDto extends createZodDto(queryUserSchema) {}

/**
 * 重置密码 DTO
 */
export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}

/**
 * 用户实体 DTO（完整用户信息）
 */
export class UserEntityDto extends createZodDto(userSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createUserSchema,
  updateUserSchema,
  queryUserSchema,
  resetPasswordSchema,
  userSchema,
} from '../schemas'
