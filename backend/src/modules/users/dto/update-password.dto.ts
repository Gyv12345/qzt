import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

/**
 * 修改密码 DTO（需要 2FA 验证）
 */
export class UpdatePasswordDto {
  @ApiProperty({ description: "当前密码", example: "currentPassword123" })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: "新密码", example: "newPassword123" })
  @IsString()
  @MinLength(6, { message: "新密码至少6个字符" })
  newPassword: string;

  @ApiProperty({
    description: "2FA 验证码（已启用 2FA 的用户需要提供）",
    required: false,
  })
  @IsString()
  twoFactorToken?: string;
}
