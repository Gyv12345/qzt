import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'
import type { ResetPassword } from '@qzt/shared-types/dist/user/schemas'

/**
 * 重置密码 DTO
 *
 * 从 @qzt/shared-types 继承类型，确保前后端类型一致
 */
export class ResetPasswordDto implements ResetPassword {
  @ApiProperty({ description: '新密码', example: 'newPassword123' })
  @IsString()
  @MinLength(6, { message: '新密码至少6个字符' })
  newPassword: string
}
