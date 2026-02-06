import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsInt, IsDateString } from "class-validator";

export class CreateFollowRecordDto {
  @ApiProperty({ description: "客户ID" })
  @IsString()
  customerId: string;

  @ApiProperty({ description: "跟进类型: 1:电话 2:微信 3:上门 4:邮件 5:其他" })
  @IsInt()
  type: number;

  @ApiProperty({ description: "跟进内容" })
  @IsString()
  content: string;

  @ApiProperty({ description: "下次跟进时间", required: false })
  @IsOptional()
  @IsDateString()
  nextTime?: string;

  @ApiProperty({ description: "图片(JSON数组)", required: false })
  @IsOptional()
  @IsString()
  images?: string;
}
