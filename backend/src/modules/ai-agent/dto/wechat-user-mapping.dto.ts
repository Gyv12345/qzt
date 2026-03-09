import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
  IsNotEmpty,
} from "class-validator";

/**
 * 查询微信用户映射 DTO
 */
export class QueryWechatUserMappingDto {
  @ApiProperty({ description: "页码", required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: "每页数量", required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiProperty({ description: "是否启用", required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

/**
 * 绑定微信用户 DTO
 */
export class BindWechatUserDto {
  @ApiProperty({ description: "企业微信用户ID" })
  @IsString()
  @IsNotEmpty()
  wechatUserId: string;

  @ApiProperty({ description: "系统用户ID" })
  @IsString()
  @IsNotEmpty()
  systemUserId: string;
}

/**
 * 微信用户映射响应 DTO
 */
export class WechatUserMappingDto {
  @ApiProperty({ description: "映射ID" })
  id: string;

  @ApiProperty({ description: "企业微信用户ID" })
  wechatUserId: string;

  @ApiProperty({ description: "企业微信用户名", required: false })
  wechatUserName?: string;

  @ApiProperty({ description: "系统用户ID", required: false })
  systemUserId?: string;

  @ApiProperty({ description: "系统用户名", required: false })
  systemUserName?: string;

  @ApiProperty({ description: "是否启用" })
  isActive: boolean;
}

/**
 * 分页响应 DTO
 */
export class PaginatedWechatUserMappingsDto {
  @ApiProperty({ description: "映射列表", type: [WechatUserMappingDto] })
  data: WechatUserMappingDto[];

  @ApiProperty({ description: "总数" })
  total: number;

  @ApiProperty({ description: "当前页" })
  page: number;

  @ApiProperty({ description: "每页数量" })
  pageSize: number;

  @ApiProperty({ description: "总页数" })
  totalPages: number;
}
