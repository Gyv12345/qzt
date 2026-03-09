import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export const TASK_STATUS_VALUES = [
  "backlog",
  "todo",
  "in progress",
  "done",
  "canceled",
] as const;

export const TASK_LABEL_VALUES = ["bug", "feature", "documentation"] as const;

export const TASK_PRIORITY_VALUES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type TaskStatus = (typeof TASK_STATUS_VALUES)[number];
export type TaskLabel = (typeof TASK_LABEL_VALUES)[number];
export type TaskPriority = (typeof TASK_PRIORITY_VALUES)[number];

export class CreateTaskDto {
  @ApiProperty({ description: "任务标题", example: "跟进 ACME 客户合同" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: "任务描述" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: "任务状态", enum: TASK_STATUS_VALUES })
  @IsOptional()
  @IsIn(TASK_STATUS_VALUES)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: "任务标签", enum: TASK_LABEL_VALUES })
  @IsOptional()
  @IsIn(TASK_LABEL_VALUES)
  label?: TaskLabel;

  @ApiPropertyOptional({ description: "任务优先级", enum: TASK_PRIORITY_VALUES })
  @IsOptional()
  @IsIn(TASK_PRIORITY_VALUES)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: "截止时间（ISO）" })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: "负责人用户 ID" })
  @IsOptional()
  @IsString()
  assigneeId?: string;
}

export class BatchUpdateTasksDto {
  @ApiProperty({ description: "任务 ID 列表", type: [String] })
  @IsArray()
  @IsString({ each: true })
  taskIds: string[];

  @ApiPropertyOptional({ description: "任务状态", enum: TASK_STATUS_VALUES })
  @IsOptional()
  @IsIn(TASK_STATUS_VALUES)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: "任务标签", enum: TASK_LABEL_VALUES })
  @IsOptional()
  @IsIn(TASK_LABEL_VALUES)
  label?: TaskLabel;

  @ApiPropertyOptional({ description: "任务优先级", enum: TASK_PRIORITY_VALUES })
  @IsOptional()
  @IsIn(TASK_PRIORITY_VALUES)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: "截止时间（ISO）" })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: "负责人用户 ID（传空字符串可清空）" })
  @IsOptional()
  @IsString()
  assigneeId?: string;
}

export class BatchDeleteTasksDto {
  @ApiProperty({ description: "任务 ID 列表", type: [String] })
  @IsArray()
  @IsString({ each: true })
  taskIds: string[];
}
