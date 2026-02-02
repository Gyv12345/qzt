import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class CreateTriggerDto {
  @ApiProperty({ description: '触发器名称', example: '新客户跟进提醒' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '触发器代码', example: 'NEW_CUSTOMER_FOLLOWUP' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: '触发器类型',
    example: 'DATA_ADD',
    enum: ['DATA_ADD', 'DATA_UPDATE', 'TIME_CONDITION', 'SCHEDULED']
  })
  @IsString()
  @IsNotEmpty()
  type: 'DATA_ADD' | 'DATA_UPDATE' | 'TIME_CONDITION' | 'SCHEDULED';

  @ApiProperty({ description: '实体类型', example: 'CUSTOMER' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    description: '条件列表',
    type: 'object',
    required: false
  })
  @IsOptional()
  @IsArray()
  conditions?: any[];
}
