import { PartialType } from '@nestjs/mapped-types';
import { CreateAutomationRuleDto } from './create-automation-rule.dto';

export class UpdateAutomationRuleDto extends PartialType(CreateAutomationRuleDto) {}
