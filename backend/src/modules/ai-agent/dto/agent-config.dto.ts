import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsString, IsOptional, IsEnum } from "class-validator";

/**
 * AI Provider 类型
 */
export enum AiProvider {
  ZHIPU = "zhipu",
  DEEPSEEK = "deepseek",
  OPENAI = "openai",
}

/**
 * AI Agent 配置 DTO
 */
export class AgentConfigDto {
  @ApiProperty({ description: "是否启用" })
  enabled: boolean;

  @ApiProperty({ description: "AI 提供商", enum: AiProvider })
  provider: AiProvider;

  @ApiProperty({ description: "模型名称" })
  model: string;

  @ApiProperty({ description: "API Key", required: false })
  apiKey?: string;
}

/**
 * 更新 AI Agent 配置 DTO
 */
export class UpdateAgentConfigDto {
  @ApiProperty({ description: "是否启用", required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    description: "AI 提供商",
    enum: AiProvider,
    required: false,
  })
  @IsOptional()
  @IsEnum(AiProvider)
  provider?: AiProvider;

  @ApiProperty({ description: "模型名称", required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ description: "API Key", required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;
}
