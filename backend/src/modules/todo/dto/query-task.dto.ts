import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from "./create-task.dto";

const TASK_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "dueDate",
  "priority",
  "status",
  "title",
] as const;

export class QueryTaskDto {
  @ApiPropertyOptional({ description: "页码", example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页条数", example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: "关键词（标题/描述）" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "状态", enum: TASK_STATUS_VALUES })
  @IsOptional()
  @IsIn(TASK_STATUS_VALUES)
  status?: (typeof TASK_STATUS_VALUES)[number];

  @ApiPropertyOptional({ description: "优先级", enum: TASK_PRIORITY_VALUES })
  @IsOptional()
  @IsIn(TASK_PRIORITY_VALUES)
  priority?: (typeof TASK_PRIORITY_VALUES)[number];

  @ApiPropertyOptional({ description: "负责人用户 ID" })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ description: "排序字段", enum: TASK_SORT_FIELDS })
  @IsOptional()
  @IsIn(TASK_SORT_FIELDS)
  sortField?: (typeof TASK_SORT_FIELDS)[number];

  @ApiPropertyOptional({ description: "排序方向", enum: ["asc", "desc"] })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}
