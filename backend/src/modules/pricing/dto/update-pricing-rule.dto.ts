import { PartialType } from '@nestjs/mapped-types';
import { CreatePricingRuleDto } from './create-pricing-rule.dto';

export class UpdatePricingRuleDto extends PartialType(CreatePricingRuleDto) {}
