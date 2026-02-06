import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEnum, IsOptional } from "class-validator";

export class ExportLogDto {
  @ApiProperty({ description: "日志类型", enum: ["operation", "system"] })
  @IsEnum(["operation", "system"])
  type: "operation" | "system";

  @ApiProperty({ description: "开始时间 (YYYY-MM-DD)", required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ description: "结束时间 (YYYY-MM-DD)", required: false })
  @IsOptional()
  @IsString()
  endDate?: string;
}
