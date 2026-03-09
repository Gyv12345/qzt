import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsNotEmpty } from "class-validator";

/**
 * 企业微信消息 DTO
 */
export class WechatMessageDto {
  @ApiProperty({ description: "企业微信用户ID" })
  @IsString()
  @IsNotEmpty()
  wechatUserId: string;

  @ApiProperty({ description: "消息内容", required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ description: "消息类型", required: false })
  @IsString()
  @IsOptional()
  msgType?: string;
}

/**
 * AI Agent 响应 DTO
 */
export class AgentResponseDto {
  @ApiProperty({ description: "响应内容" })
  content: string;

  @ApiProperty({ description: "意图类型", required: false })
  intent?: string;

  @ApiProperty({ description: "是否需要更多信息", required: false })
  needMoreInfo?: boolean;

  @ApiProperty({ description: "缺失字段列表", required: false })
  missingFields?: string[];

  @ApiProperty({ description: "操作结果", required: false })
  result?: Record<string, unknown>;
}
