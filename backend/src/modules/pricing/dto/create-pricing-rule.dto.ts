import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";

export enum PricingRuleType {
  AMOUNT_TIER = "AMOUNT_TIER", // 按金额阶梯
  COUNT_TIER = "COUNT_TIER", // 按次数计费
  ZERO_DECLARATION = "ZERO_DECLARATION", // 零申报
}

class PricingTierDto {
  @IsNumber()
  minThreshold: number;

  @IsNumber()
  @IsOptional()
  maxThreshold?: number;

  @IsNumber()
  price: number;

  @IsNumber()
  @IsOptional()
  additionalPrice?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  order: number;
}

export class CreatePricingRuleDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(PricingRuleType)
  ruleType: PricingRuleType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingTierDto)
  tiers: PricingTierDto[];

  @IsString()
  @IsOptional()
  expiryDate?: string;
}
