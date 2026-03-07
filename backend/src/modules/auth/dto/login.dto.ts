import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";
import type { Login } from "@qzt/shared-types/dist/auth/schemas";

/**
 * 登录 DTO
 *
 * 从 @qzt/shared-types 继承验证规则
 */
export class LoginDto implements Login {
  @ApiProperty({ description: "用户名" })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: "密码" })
  @IsString()
  @IsNotEmpty()
  password: string;
}
