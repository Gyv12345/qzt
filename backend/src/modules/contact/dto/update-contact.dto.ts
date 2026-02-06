import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsDateString,
} from "class-validator";

/**
 * 更新联系人 DTO
 *
 * 从 @qzt/shared-types 继承类型，确保前后端类型一致
 * 所有字段都是可选的
 */
export class UpdateContactDto {
  @ApiPropertyOptional({ description: "联系人姓名", example: "张三" })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: "联系人姓名不能为空" })
  @MaxLength(50, { message: "姓名最多50个字符" })
  name?: string;

  @ApiPropertyOptional({ description: "联系电话", example: "13800138000" })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: "手机号格式不正确" })
  phone?: string;

  @ApiPropertyOptional({ description: "联系邮箱" })
  @IsOptional()
  @IsEmail({}, { message: "请输入有效的邮箱地址" })
  email?: string;

  @ApiPropertyOptional({ description: "微信号" })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "微信号最多50个字符" })
  wechat?: string;

  @ApiPropertyOptional({ description: "职位" })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "职位最多50个字符" })
  position?: string;

  @ApiPropertyOptional({ description: "部门" })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "部门最多50个字符" })
  department?: string;

  @ApiPropertyOptional({ description: "生日" })
  @IsOptional()
  @IsDateString()
  birthdate?: string;

  @ApiPropertyOptional({ description: "标签(JSON数组)" })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "备注最多500个字符" })
  remark?: string;
}
