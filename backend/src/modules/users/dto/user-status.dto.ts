import { ApiProperty } from '@nestjs/swagger'

/**
 * 用户状态枚举（字符串版本）
 *
 * 与 @qzt/shared-types 保持一致
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
