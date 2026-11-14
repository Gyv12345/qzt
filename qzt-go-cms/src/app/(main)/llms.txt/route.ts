import { llmsTxt, mdResponse } from "@/lib/markdown";

/**
 * /llms.txt — 站点总览, 遵循 https://llmstxt.org 规范。
 * AI 搜索引擎通过此入口发现站点的 Markdown 内容。
 */
export const revalidate = 300;

export function GET() {
  return mdResponse(llmsTxt());
}
