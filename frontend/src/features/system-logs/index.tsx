import { Terminal } from "lucide-react";
import { Main } from "@/components/layout/main";
import { SystemLogsViewer } from "./components/system-logs-viewer";

export function SystemLogsPage() {
  return (
    <Main fixed>
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
          <Terminal className="h-6 w-6" />
          系统日志
        </h1>
        <p className="text-muted-foreground">
          查看服务器系统日志（PM2、Redis、Nginx）
        </p>
      </div>
      <SystemLogsViewer />
    </Main>
  );
}
