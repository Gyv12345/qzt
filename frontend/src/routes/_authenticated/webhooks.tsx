import { createFileRoute } from "@tanstack/react-router";
import { WebhookSettings } from "@/features/webhooks";

export const Route = createFileRoute("/_authenticated/webhooks")({
  component: WebhookSettings,
});
