import { useTranslation } from "react-i18next";
import { Main } from "@/components/layout/main";
import { AgentConfigCard } from "./components/agent-config-card";
import { AgentTestDialog } from "./components/agent-test-dialog";
import { AgentLogsTable } from "./components/agent-logs-table";
import { Bot } from "lucide-react";

/**
 * AI Agent 配置页面
 */
export default function AiAgentPage() {
  const { t } = useTranslation();

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      {/* 页面头部 */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("aiAgent.title", "AI Agent")}
          </h2>
          <p className="text-muted-foreground">
            {t(
              "aiAgent.description",
              "配置 AI Agent，支持通过企业微信快速操作业务系统",
            )}
          </p>
        </div>
        <AgentTestDialog />
      </div>

      {/* 主要内容 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左侧：配置卡片 */}
        <AgentConfigCard />

        {/* 右侧：操作日志 */}
        <AgentLogsTable />
      </div>

      {/* 使用说明 */}
      <div className="rounded-lg border bg-muted/50 p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5" />
          {t("aiAgent.guide.title", "使用指南")}
        </h3>
        <div className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-2">
              {t("aiAgent.guide.setup.title", "配置步骤")}
            </h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                {t("aiAgent.guide.setup.step1", "在智谱开放平台注册账号")}
              </li>
              <li>
                {t("aiAgent.guide.setup.step2", "创建应用并获取 API Key")}
              </li>
              <li>
                {t("aiAgent.guide.setup.step3", "在上方配置卡片中填入 API Key")}
              </li>
              <li>{t("aiAgent.guide.setup.step4", "开启 AI Agent 功能")}</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">
              {t("aiAgent.guide.features.title", "支持的操作")}
            </h4>
            <ul className="list-disc list-inside space-y-1">
              <li>
                {t(
                  "aiAgent.guide.features.customer",
                  "创建客户 - 新建客户北京科技公司",
                )}
              </li>
              <li>
                {t(
                  "aiAgent.guide.features.follow",
                  "添加跟进 - 给客户添加跟进记录",
                )}
              </li>
              <li>
                {t(
                  "aiAgent.guide.features.contract",
                  "创建合同 - 创建合同，金额5万元",
                )}
              </li>
              <li>
                {t(
                  "aiAgent.guide.features.payment",
                  "创建回款 - 添加回款，金额2万元",
                )}
              </li>
              <li>
                {t(
                  "aiAgent.guide.features.query",
                  "查询客户 - 查询客户北京科技",
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Main>
  );
}
