import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAgentLogs } from "../hooks/use-agent";
import { Loader2, History, CheckCircle, XCircle } from "lucide-react";

/**
 * 意图类型映射
 */
const intentLabels: Record<string, string> = {
  create_customer: "创建客户",
  create_follow_record: "创建跟进记录",
  create_contract: "创建合同",
  create_payment: "创建回款",
  query_customer: "查询客户",
  help: "帮助",
  unknown: "未知",
};

/**
 * AI Agent 操作日志表格
 */
export function AgentLogsTable() {
  const { t } = useTranslation();
  const { data, isLoading } = useAgentLogs({
    page: 1,
    pageSize: 10,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {t("aiAgent.logs.title", "操作日志")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data?.data && data.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("aiAgent.logs.time", "时间")}</TableHead>
                <TableHead>{t("aiAgent.logs.intent", "意图")}</TableHead>
                <TableHead>{t("aiAgent.logs.input", "输入")}</TableHead>
                <TableHead>{t("aiAgent.logs.status", "状态")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {intentLabels[log.intent] || log.intent}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {log.inputMessage}
                  </TableCell>
                  <TableCell>
                    {log.success ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        {t("aiAgent.logs.success", "成功")}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        {t("aiAgent.logs.failed", "失败")}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {t("aiAgent.logs.empty", "暂无操作日志")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
