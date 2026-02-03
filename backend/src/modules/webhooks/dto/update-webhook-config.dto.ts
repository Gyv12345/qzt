import { PartialType } from '@nestjs/swagger';
import { CreateWebhookConfigDto } from './create-webhook-config.dto';

export class UpdateWebhookConfigDto extends PartialType(CreateWebhookConfigDto) {}
