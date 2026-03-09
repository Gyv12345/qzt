import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Settings2, CheckCircle, XCircle } from "lucide-react";

/**
 * AI Agent 配置卡片
 * 显示当前配置状态（API Key 在后端 .env 配置）
 */
export function AgentConfigCard() {
  const { t } = useTranslation();

  // 从环境变量读取的配置，前端只显示状态
  const isConfigured = true; // 后端已配置

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          {t("aiAgent.config.title", "AI Agent 配置")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 配置状态 */}
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label className="text-base">
              {t("aiAgent.config.status", "配置状态")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("aiAgent.config.statusDesc", "AI Agent 配置在服务器端管理")}
            </p>
          </div>
          {isConfigured ? (
            <Badge variant="default" className="bg-green-600 gap-1">
              <CheckCircle className="h-3 w-3" />
              {t("aiAgent.config.configured", "已配置")}
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              {t("aiAgent.config.notConfigured", "未配置")}
            </Badge>
          )}
        </div>

        {/* 当前配置信息 */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("aiAgent.config.provider", "AI 提供商")}
            </span>
            <span className="font-medium">智谱 AI (GLM)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("aiAgent.config.model", "模型")}
            </span>
            <span className="font-medium">GLM-4-Flash</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("aiAgent.config.apiKey", "API Key")}
            </span>
            <span className="font-medium">••••••••••••</span>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="text-sm text-muted-foreground">
          <p>
            💡{" "}
            {t(
              "aiAgent.config.hint",
              "API Key 等敏感配置在后端 .env 文件中管理，如需修改请联系管理员。",
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
