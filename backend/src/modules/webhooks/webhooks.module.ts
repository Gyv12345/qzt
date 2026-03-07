import { Module } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { WebhooksController } from "./webhooks.controller";
import { WebhookTemplatesService } from "./webhook-templates.service";
import { WebhookTemplatesController } from "./webhook-templates.controller";

@Module({
  controllers: [WebhooksController, WebhookTemplatesController],
  providers: [WebhooksService, WebhookTemplatesService],
  exports: [WebhooksService, WebhookTemplatesService],
})
export class WebhooksModule {}
