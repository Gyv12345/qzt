import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { RefreshCw, Search, Download, Pause, Play, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import axiosInstance from "@/services/api-client";

interface LogStats {
  totalLines: number;
  errorCount: number;
  warnCount: number;
  requestCount?: number;
  lastUpdate: string;
}

interface LogsResponse {
  logs: string[];
  stats: LogStats;
}

export function SystemLogsViewer() {
  const [activeTab, setActiveTab] = useState<"pm2" | "nginx" | "redis">("pm2");
  const [logLevel] = useState<"all" | "error" | "warn" | "info">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [lineCount, setLineCount] = useState(100);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 获取日志
  const { data, isLoading, refetch } = useQuery<LogsResponse>({
    queryKey: ["system-logs", activeTab, lineCount, logLevel, searchTerm],
    queryFn: async () => {
      const response = await axiosInstance.get<LogsResponse>(
        `/system-logs/${activeTab}`,
        {
          params: {
            lines: lineCount,
            level: logLevel,
            search: searchTerm,
          },
        },
      );
      return response.data;
    },
    refetchInterval: isPaused ? false : 3000,
  });

  const logs = data?.logs || [];

  // 自动滚动
  useEffect(() => {
    if (autoScroll && scrollRef.current && logs.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // 日志颜色
  const getLogColor = (line: string) => {
    if (line.includes("ERROR") || line.includes("error")) return "text-red-500";
    if (line.includes("WARN") || line.includes("warn"))
      return "text-yellow-500";
    if (line.includes("INFO") || line.includes("info")) return "text-blue-400";
    return "text-muted-foreground";
  };

  // 导出日志
  const exportLogs = () => {
    const blob = new Blob([logs.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}-logs-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* 控制栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* 刷新 */}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>

            {/* 搜索 */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索日志内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* 暂停/继续 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? (
                <Play className="h-4 w-4 mr-2" />
              ) : (
                <Pause className="h-4 w-4 mr-2" />
              )}
              {isPaused ? "继续" : "暂停"}
            </Button>

            {/* 导出 */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={logs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>

            {/* 行数控制 */}
            <div className="flex items-center gap-2 min-w-[150px]">
              <span className="text-sm text-muted-foreground">行数:</span>
              <Slider
                value={[lineCount]}
                onValueChange={([v]) => setLineCount(v)}
                min={50}
                max={1000}
                step={50}
                className="flex-1"
              />
              <span className="text-sm font-mono w-12">{lineCount}</span>
            </div>

            {/* 自动滚动 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoScroll"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="autoScroll" className="text-sm">
                自动滚动
              </label>
            </div>
          </div>

          {/* 服务选择 Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="mt-4"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pm2" className="flex items-center gap-2">
                PM2 日志
                {activeTab === "pm2" && data?.stats && (
                  <Badge variant="secondary" className="ml-auto">
                    {data.stats.errorCount} 错误
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="nginx" className="flex items-center gap-2">
                Nginx 日志
                {activeTab === "nginx" && data?.stats && (
                  <Badge variant="secondary" className="ml-auto">
                    {data.stats.requestCount} 请求
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="redis" className="flex items-center gap-2">
                Redis 日志
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pm2">
              <LogContent
                logs={logs}
                isLoading={isLoading}
                getLogColor={getLogColor}
                scrollRef={scrollRef}
              />
            </TabsContent>

            <TabsContent value="nginx">
              <LogContent
                logs={logs}
                isLoading={isLoading}
                getLogColor={getLogColor}
                scrollRef={scrollRef}
              />
            </TabsContent>

            <TabsContent value="redis">
              <LogContent
                logs={logs}
                isLoading={isLoading}
                getLogColor={getLogColor}
                scrollRef={scrollRef}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 日志统计 */}
      {data?.stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">总行数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.totalLines}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">错误</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {data.stats.errorCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">警告</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {data.stats.warnCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">最后更新</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {data.stats.lastUpdate}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// 日志内容组件
function LogContent({
  logs,
  isLoading,
  getLogColor,
  scrollRef,
}: {
  logs: string[];
  isLoading: boolean;
  getLogColor: (line: string) => string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  // 复制日志到剪贴板
  const copyLogs = () => {
    const text = logs.map((line, index) => `[${index + 1}] ${line}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      // 可以添加提示
      console.log("日志已复制到剪贴板");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>日志内容</span>
          <div className="flex items-center gap-2">
            {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
            {logs.length > 0 && (
              <Button variant="outline" size="sm" onClick={copyLogs}>
                <Copy className="h-4 w-4 mr-2" />
                复制日志
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div
          ref={scrollRef}
          className="h-[500px] overflow-y-auto p-4 font-mono text-xs bg-muted rounded-md"
          style={{ wordBreak: "break-all", whiteSpace: "pre-wrap" }}
        >
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {isLoading ? "加载中..." : "暂无日志"}
            </div>
          ) : (
            logs.map((line, index) => (
              <div key={index} className={`${getLogColor(line)} mb-1`}>
                <span className="text-muted-foreground mr-4 select-none inline-block w-12">
                  {index + 1}
                </span>
                <span className="break-all">{line}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
