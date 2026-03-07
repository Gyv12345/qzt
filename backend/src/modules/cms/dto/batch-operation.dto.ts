import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
} from "class-validator";

/**
 * 批量操作 DTO
 */
export class BatchOperationDto {
  @ApiProperty({
    description: "要操作的 ID 列表",
    example: ["clx1234567890", "clx0987654321"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[];
}

/**
 * 批量发布 DTO
 */
export class BatchPublishDto extends BatchOperationDto {}

/**
 * 批量取消发布 DTO
 */
export class BatchUnpublishDto extends BatchOperationDto {}

/**
 * 批量删除 DTO
 */
export class BatchDeleteDto extends BatchOperationDto {}

/**
 * 批量归档 DTO
 */
export class BatchArchiveDto extends BatchOperationDto {}

/**
 * 批量操作结果 DTO
 */
export class BatchOperationResultDto {
  @ApiProperty({ description: "成功数量", example: 5 })
  success: number;

  @ApiProperty({ description: "失败数量", example: 0 })
  failed: number;

  @ApiPropertyOptional({
    description: "失败的 ID 列表",
    example: ["clx1234567890"],
  })
  failedIds?: string[];

  @ApiProperty({ description: "消息", example: "批量操作完成" })
  message: string;
}

/**
 * 版本恢复 DTO
 */
export class RestoreVersionDto {
  @ApiPropertyOptional({
    description: "变更说明",
    example: "恢复到之前版本",
  })
  @IsOptional()
  @IsString()
  changeNote?: string;
}
