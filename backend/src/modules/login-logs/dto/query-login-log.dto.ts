import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class QueryLoginLogDto {
  @ApiProperty({ description: "页码", example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: "每页数量", example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiProperty({ description: "用户ID", required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: "用户名", required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: "登录状态 (SUCCESS/FAILED)", required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: "开始时间 (YYYY-MM-DD)", required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ description: "结束时间 (YYYY-MM-DD)", required: false })
  @IsOptional()
  @IsString()
  endDate?: string;
}
