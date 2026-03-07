import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

/**
 * 启用 2FA 请求 DTO
 */
export class Enable2faDto {
  @ApiProperty({ description: "TOTP 密钥" })
  @IsString()
  secret: string;

  @ApiProperty({ description: "6位验证码", minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  token: string;
}
