import { Main } from "@/components/layout/main";
import { WebhookConfigsTable } from "./components/webhook-configs-table";
import { WebhookCreateDrawer } from "./components/webhook-create-drawer";

export function WebhookSettings() {
  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Webhook 配置</h2>
          <p className="text-muted-foreground">
            管理企业微信、飞书、钉钉的 Webhook 推送配置
          </p>
        </div>
        <WebhookCreateDrawer />
      </div>
      <WebhookConfigsTable />
    </Main>
  );
}
