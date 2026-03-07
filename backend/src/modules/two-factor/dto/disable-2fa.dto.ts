import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

/**
 * 禁用 2FA 请求 DTO
 */
export class Disable2faDto {
  @ApiProperty({
    description: "6位验证码或备份码",
    minLength: 6,
    maxLength: 12,
  })
  @IsString()
  @Length(6, 12)
  token: string;
}
