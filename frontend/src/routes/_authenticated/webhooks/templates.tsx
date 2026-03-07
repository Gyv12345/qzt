import { createFileRoute } from "@tanstack/react-router";
import { WebhookTemplatesPage } from "@/features/webhooks/components/webhook-templates-page";

export const Route = createFileRoute("/_authenticated/webhooks/templates")({
  component: WebhookTemplatesPage,
});
