import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, IsOptional, ArrayNotEmpty } from "class-validator";

export class BatchAssignDto {
  @ApiProperty({ description: "客户ID列表", example: ["id1", "id2"] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  customerIds: string[];

  @ApiProperty({ description: "新跟进人ID", example: "userId123" })
  @IsString()
  newFollowUserId: string;

  @ApiProperty({ description: "分配原因", required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AssignDto {
  @ApiProperty({ description: "客户ID", example: "customerId123" })
  @IsString()
  customerId: string;

  @ApiProperty({ description: "新跟进人ID", example: "userId123" })
  @IsString()
  newFollowUserId: string;

  @ApiProperty({ description: "分配原因", required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
