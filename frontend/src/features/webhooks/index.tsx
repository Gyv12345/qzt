import { ContentSection } from "@/features/settings/components/content-section";
import { WebhookConfigsTable } from "./components/webhook-configs-table";
import { WebhookCreateDrawer } from "./components/webhook-create-drawer";

export function WebhookSettings() {
  return (
    <ContentSection
      title="webhooks.title"
      desc="webhooks.description"
      headerContent={<WebhookCreateDrawer />}
    >
      <WebhookConfigsTable />
    </ContentSection>
  );
}
