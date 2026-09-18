import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * GEO: 显式放行主流 AI 爬虫/生成式引擎, 确保内容可被
 * ChatGPT/Perplexity/Claude/Gemini/豆包(Kimi 等国内引擎多复用 Bytespider)
 * 抓取引用。通配符已放行, 这里逐个声明防止未来收紧通配时误伤。
 */
const AI_CRAWLERS = [
  "GPTBot", // OpenAI 训练
  "OAI-SearchBot", // ChatGPT 搜索
  "ChatGPT-User", // ChatGPT 实时抓取
  "ClaudeBot", // Anthropic
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot", // Perplexity
  "Perplexity-User",
  "Google-Extended", // Gemini
  "Applebot-Extended", // Apple Intelligence
  "Bytespider", // 字节(豆包)
  "CCBot", // Common Crawl(多数 LLM 语料上游)
];

export default function robots(): MetadataRoute.Robots {
  const allowAll = AI_CRAWLERS.map((ua) => ({ userAgent: ua, allow: "/" }));
  return {
    rules: [...allowAll, { userAgent: "*", allow: "/" }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
