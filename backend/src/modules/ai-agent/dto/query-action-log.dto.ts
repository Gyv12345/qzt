import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
} from "class-validator";

/**
 * 查询操作日志 DTO
 */
export class QueryActionLogDto {
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

  @ApiProperty({ description: "意图类型", required: false })
  @IsOptional()
  @IsString()
  intent?: string;

  @ApiProperty({ description: "是否成功", required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  success?: boolean;
}

/**
 * 操作日志响应 DTO
 */
export class ActionLogDto {
  @ApiProperty({ description: "日志ID" })
  id: string;

  @ApiProperty({ description: "系统用户ID" })
  systemUserId: string;

  @ApiProperty({ description: "意图类型" })
  intent: string;

  @ApiProperty({ description: "输入消息" })
  inputMessage: string;

  @ApiProperty({ description: "提取的数据", required: false })
  extractedData?: string;

  @ApiProperty({ description: "操作结果", required: false })
  actionResult?: string;

  @ApiProperty({ description: "是否成功" })
  success: boolean;

  @ApiProperty({ description: "创建时间" })
  createdAt: string;
}

/**
 * 分页响应 DTO
 */
export class PaginatedActionLogsDto {
  @ApiProperty({ description: "日志列表", type: [ActionLogDto] })
  data: ActionLogDto[];

  @ApiProperty({ description: "总数" })
  total: number;

  @ApiProperty({ description: "当前页" })
  page: number;

  @ApiProperty({ description: "每页数量" })
  pageSize: number;

  @ApiProperty({ description: "总页数" })
  totalPages: number;
}
