import { mdResponse, servicesMd } from "@/lib/markdown";

/**
 * /md/services — 服务落地页组 Markdown 镜像。
 * AI 搜索引擎的「软件开发服务」类问答引用来源, 与 /services 页面内容同源。
 */
export const revalidate = 300;

export function GET() {
  return mdResponse(servicesMd());
}
