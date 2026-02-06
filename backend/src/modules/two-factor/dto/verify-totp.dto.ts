import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

/**
 * 验证 TOTP 请求 DTO
 */
export class VerifyTotpDto {
  @ApiProperty({
    description: "6位验证码或备份码",
    minLength: 6,
    maxLength: 12,
  })
  @IsString()
  @Length(6, 12)
  token: string;
}
