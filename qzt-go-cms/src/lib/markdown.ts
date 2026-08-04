/**
 * GEO (Generative Engine Optimization) Markdown 生成层。
 *
 * 为 AI 搜索引擎 (ChatGPT/Perplexity/Google AI Overviews) 提供
 * 结构化纯 Markdown 输出, 遵循 llms.txt 标准。
 *
 * 所有生成器为纯函数, 由 route handler 调用, 不触碰 HTML 页面逻辑。
 */
import type { Article, Partner, Product, ProductDetail, TeamMember } from "./types";
import { SITE } from "./site";

// ── 轻量 HTML→Markdown 转换 ──────────────────────────────────────────
// 覆盖 CMS 常见富文本标签; 复杂结构降级为纯文本, 保证永不报错。

/** 解码常见 HTML 实体。 */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** 把 CMS 富文本 HTML 转为 Markdown。轻量正则实现, 无外部依赖。 */
export function htmlToMd(html: string): string {
  if (!html) return "";
  let s = html;

  // 块级: 标题 (h1-h6 → #-######)
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, lvl, inner) => {
    return `\n${"#".repeat(Number(lvl))} ${stripTags(inner).trim()}\n`;
  });
  // 图片 (转 Markdown 图片语法)
  s = s.replace(/<img[^>]*\bsrc=["']([^"']*)["'][^>]*\balt=["']([^"']*)["'][^>]*\/?>(?:<\/img>)?/gi, (_, src, alt) => `\n![${alt}](${src})\n`);
  s = s.replace(/<img[^>]*\balt=["']([^"']*)["'][^>]*\bsrc=["']([^"']*)["'][^>]*\/?>(?:<\/img>)?/gi, (_, alt, src) => `\n![${alt}](${src})\n`);
  s = s.replace(/<img[^>]*\bsrc=["']([^"']*)["'][^>]*\/?>(?:<\/img>)?/gi, (_, src) => `\n![](${src})\n`);
  // 链接 (保留文本与 href)
  s = s.replace(/<a[^>]*\bhref=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => `[${stripTags(inner).trim()}](${href})`);
  // 加粗 / 斜体
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => `**${stripTags(inner).trim()}**`);
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => `*${stripTags(inner).trim()}*`);
  // 列表
  s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => {
    return (
      "\n" +
      inner
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_li: string, c: string) => `- ${stripTags(c).trim()}\n`)
        .replace(/<\/?(ul|ol|li)[^>]*>/gi, "") +
      "\n"
    );
  });
  s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner: string) => {
    let i = 1;
    return (
      "\n" +
      inner
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_li: string, c: string) => `${i++}. ${stripTags(c).trim()}\n`)
        .replace(/<\/?(ul|ol|li)[^>]*>/gi, "") +
      "\n"
    );
  });
  // 引用
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) =>
    "\n" + stripTags(inner).trim().split("\n").map((l: string) => `> ${l}`).join("\n") + "\n"
  );
  // 代码块
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner) => `\n\`\`\`\n${stripTags(inner).trim()}\n\`\`\`\n`);
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, inner) => `\`${stripTags(inner).trim()}\``);
  // 换行
  s = s.replace(/<br\s*\/?>/gi, "\n");
  // 段落 / div → 换行
  s = s.replace(/<\/(p|div|section|article)>/gi, "\n");
  s = s.replace(/<(p|div|section|article)[^>]*>/gi, "\n");
  // 简易表格: 转 Markdown 表格 (thead + tbody)。不匹配则降级纯文本。
  s = s.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableInner) => tableToMarkdown(tableInner));
  // 去除剩余标签
  s = stripTags(s);
  // 解码实体 + 压缩多余空行
  s = decodeEntities(s);
  s = s.replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

/** 移除所有 HTML 标签 (保留内部文本)。 */
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

/** 把 <table> 内部 HTML 转 Markdown 表格; 解析失败降级为纯文本。 */
function tableToMarkdown(inner: string): string {
  try {
    const rows: string[][] = [];
    const rowMatches = inner.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const rowHtml of rowMatches) {
      const cells = (rowHtml.match(/<t[hd][^>]*>[\s\S]*?<\/t[hd]>/gi) || []).map((c) =>
        stripTags(c).trim(),
      );
      if (cells.length) rows.push(cells);
    }
    if (!rows.length) return stripTags(inner).trim();
    const header = rows[0];
    const body = rows.slice(1);
    const colCount = header.length;
    const md = [
      `| ${header.join(" | ")} |`,
      `| ${header.map(() => "---").join(" | ")} |`,
      ...body.map((r) => `| ${r.map((c, i) => c ?? "").join(" | ")} |`),
    ];
    void colCount;
    return "\n" + md.join("\n") + "\n";
  } catch {
    return stripTags(inner).trim();
  }
}

// ── Frontmatter 辅助 ──────────────────────────────────────────────────

/** 生成 YAML frontmatter 字符串。字段顺序稳定。 */
function frontmatter(fields: Record<string, string | number | undefined>): string {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === "") continue;
    // 值含特殊字符则加引号
    const sv = String(v);
    const needsQuote = /[:#\-?{}[\],&*!|>'"%@`]/.test(sv);
    lines.push(`${k}: ${needsQuote ? JSON.stringify(sv) : sv}`);
  }
  lines.push("---");
  return lines.join("\n");
}

/** 拼接绝对 URL。 */
function abs(path: string): string {
  return `${SITE.url}${path}`;
}

// ── 产品 ──────────────────────────────────────────────────────────────

/** 单个产品详情 → Markdown (含价格方案表)。 */
export function productToMd(p: ProductDetail): string {
  const fm = frontmatter({
    title: p.name,
    description: p.description || p.name,
    url: abs(`/products/${p.id}`),
    md_url: abs(`/md/products/${p.id}`),
    category: p.category,
    product_no: p.product_no,
    unit: p.unit,
    standard_price: Number(p.standard_price) > 0 ? `¥${p.standard_price}` : undefined,
    source: SITE.name,
  });

  const parts: string[] = [fm, "", `# ${p.name}`, ""];

  if (p.category) parts.push(`> **分类**: ${p.category}`);
  if (p.product_no) parts.push(`> **编号**: ${p.product_no}`);
  if (Number(p.standard_price) > 0) parts.push(`> **标准价格**: ¥${p.standard_price}${p.unit ? ` / ${p.unit}` : ""}`);
  if (p.category || p.product_no || Number(p.standard_price) > 0) parts.push("");

  if (p.description) {
    parts.push("## 产品介绍", "", p.description, "");
  }

  if (p.prices && p.prices.length > 0) {
    parts.push("## 价格方案", "");
    parts.push("| 价格类型 | 价格 | 起购数量 | 备注 |");
    parts.push("| --- | --- | --- | --- |");
    for (const pr of p.prices) {
      parts.push(
        `| ${pr.price_type || "—"} | ¥${pr.price} | ${pr.min_quantity ?? "—"} | ${pr.remark || "—"} |`,
      );
    }
    parts.push("");
  }

  parts.push("---", "", `*来源: [${SITE.name}](${SITE.url}) · [查看网页版](${abs(`/products/${p.id}`)}) *`);
  return parts.join("\n");
}

/** 产品列表 → Markdown (概览 + 表格 + 详情链接)。 */
export function productListToMd(list: Product[]): string {
  const fm = frontmatter({
    title: "产品与服务",
    description: `${SITE.name} 全部在售产品列表, 数据实时同步。`,
    url: abs("/products"),
    md_url: abs("/md/products"),
    count: list.length,
    source: SITE.name,
  });

  const parts: string[] = [
    fm,
    "",
    "# 产品与服务",
    "",
    `${SITE.name} 提供的全部产品与服务。以下是当前在售产品列表 (共 ${list.length} 项)。`,
    "",
  ];

  if (list.length === 0) {
    parts.push("*暂无产品数据。*");
    return parts.join("\n");
  }

  parts.push("| 名称 | 分类 | 标准价格 | 编号 |", "| --- | --- | --- | --- |");
  for (const p of list) {
    const price = Number(p.standard_price) > 0 ? `¥${p.standard_price}` : "—";
    parts.push(
      `| [${p.name}](${abs(`/md/products/${p.id}`)}) | ${p.category || "—"} | ${price} | ${p.product_no || "—"} |`,
    );
  }
  parts.push("");
  parts.push("## 产品详情", "");
  for (const p of list) {
    parts.push(`- [${p.name}](${abs(`/md/products/${p.id}`)})${p.description ? ` — ${p.description.slice(0, 60)}` : ""}`);
  }

  parts.push("", "---", "", `*来源: [${SITE.name}](${SITE.url}) · [查看网页版](${abs("/products")})*`);
  return parts.join("\n");
}

// ── 文章 ──────────────────────────────────────────────────────────────

/** 单篇文章 → Markdown。正文为富文本 HTML 时转 MD。 */
export function articleToMd(a: Article): string {
  const fm = frontmatter({
    title: a.title,
    description: a.summary || a.title,
    url: abs(`/news/${a.slug || a.id}`),
    md_url: abs(`/md/news/${a.slug || a.id}`),
    category: a.category?.name,
    date: a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : undefined,
    views: a.view_count,
    source: SITE.name,
  });

  const parts: string[] = [fm, "", `# ${a.title}`, ""];

  const meta: string[] = [];
  if (a.category?.name) meta.push(`分类: ${a.category.name}`);
  if (a.created_at) meta.push(`发布于: ${new Date(a.created_at).toLocaleDateString("zh-CN")}`);
  if (typeof a.view_count === "number") meta.push(`阅读: ${a.view_count}`);
  if (meta.length) parts.push(`> ${meta.join(" · ")}`, "");

  if (a.summary) parts.push("> " + a.summary.split("\n").join("\n> "), "");

  if (a.content) {
    parts.push(htmlToMd(a.content), "");
  } else if (a.summary) {
    parts.push(a.summary, "");
  }

  parts.push("---", "", `*来源: [${SITE.name}](${SITE.url}) · [查看网页版](${abs(`/news/${a.slug || a.id}`)}) *`);
  return parts.join("\n");
}

/** 文章列表 → Markdown。 */
export function articleListToMd(list: Article[]): string {
  const fm = frontmatter({
    title: "新闻动态",
    description: `${SITE.name} 最新资讯与公告。`,
    url: abs("/news"),
    md_url: abs("/md/news"),
    count: list.length,
    source: SITE.name,
  });

  const parts: string[] = [
    fm,
    "",
    "# 新闻动态",
    "",
    `${SITE.name} 的最新资讯与公告 (共 ${list.length} 篇)。`,
    "",
  ];

  if (list.length === 0) {
    parts.push("*暂无新闻。*");
    return parts.join("\n");
  }

  for (const a of list) {
    const slug = a.slug || a.id;
    const date = a.created_at ? new Date(a.created_at).toLocaleDateString("zh-CN") : "";
    parts.push(`## [${a.title}](${abs(`/md/news/${slug}`)})`);
    if (date || a.category?.name) {
      parts.push(`> ${[a.category?.name && `**${a.category.name}**`, date].filter(Boolean).join(" · ")}`);
    }
    if (a.summary) parts.push("", a.summary);
    parts.push("");
  }

  parts.push("---", "", `*来源: [${SITE.name}](${SITE.url}) · [查看网页版](${abs("/news")})*`);
  return parts.join("\n");
}

// ── 合作方 ────────────────────────────────────────────────────────────

/** 合作方列表 → Markdown。 */
export function partnerListToMd(list: Partner[]): string {
  const fm = frontmatter({
    title: "合作伙伴",
    description: `与 ${SITE.name} 合作的客户与伙伴, 数据来源于 CRM 系统。`,
    url: abs("/partners"),
    md_url: abs("/md/partners"),
    count: list.length,
    source: SITE.name,
  });

  const parts: string[] = [
    fm,
    "",
    "# 合作伙伴",
    "",
    `${SITE.name} 服务的客户与合作伙伴 (共 ${list.length} 家)。`,
    "",
  ];

  if (list.length === 0) {
    parts.push("*暂无合作方数据。*");
    return parts.join("\n");
  }

  parts.push("| 名称 | 行业 | 级别 |", "| --- | --- | --- |");
  for (const p of list) {
    parts.push(`| ${p.name} | ${p.industry || "—"} | ${p.level || "—"} |`);
  }

  parts.push("", "---", "", `*来源: [${SITE.name}](${SITE.url}) · [查看网页版](${abs("/partners")})*`);
  return parts.join("\n");
}

// ── 团队 ──────────────────────────────────────────────────────────────

/** 团队列表 → Markdown。 */
export function teamListToMd(list: TeamMember[]): string {
  const fm = frontmatter({
    title: "我们的团队",
    description: `${SITE.name} 团队成员。`,
    url: abs("/team"),
    md_url: abs("/md/team"),
    count: list.length,
    source: SITE.name,
  });

  const parts: string[] = [
    fm,
    "",
    "# 我们的团队",
    "",
    `${SITE.name} 的专业团队成员 (共 ${list.length} 位)。`,
    "",
  ];

  if (list.length === 0) {
    parts.push("*暂无团队成员。*");
    return parts.join("\n");
  }

  parts.push("| 姓名 | 职位 |", "| --- | --- |");
  for (const m of list) {
    parts.push(`| ${m.nickname} | ${m.position || "—"} |`);
  }

  parts.push("", "---", "", `*来源: [${SITE.name}](${SITE.url}) · [查看网页版](${abs("/team")})*`);
  return parts.join("\n");
}

// ── 关于页 ────────────────────────────────────────────────────────────

/** 关于页 → Markdown。 */
export function aboutToMd(title: string, html: string): string {
  const fm = frontmatter({
    title: title || "关于我们",
    description: `了解 ${SITE.name}。`,
    url: abs("/about"),
    md_url: abs("/md/about"),
    source: SITE.name,
  });

  const parts: string[] = [fm, "", `# ${title || "关于我们"}`, ""];
  if (html) {
    parts.push(htmlToMd(html), "");
  }
  parts.push("---", "", `*来源: [${SITE.name}](${SITE.url}) · [查看网页版](${abs("/about")})*`);
  return parts.join("\n");
}

// ── llms.txt 标准 ─────────────────────────────────────────────────────

/**
 * llms.txt 站点总览 (遵循 https://llmstxt.org 规范):
 * 标题 + 描述 + 可选详情 + 板块 H1 链接列表。
 */
export function llmsTxt(): string {
  const parts: string[] = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    `${SITE.name} 是一套企业级业务管理平台官网, 提供产品、团队、合作伙伴及新闻动态信息。所有内容提供 Markdown 版本, 便于 AI 检索与引用。`,
    "",
    "## 板块",
    "",
    `- [产品与服务](${abs("/md/products")}): 全部在售产品列表与详情`,
    `- [新闻动态](${abs("/md/news")}): 最新资讯与公告`,
    `- [团队](${abs("/md/team")}): 团队成员`,
    `- [合作伙伴](${abs("/md/partners")}): 合作客户与伙伴`,
    `- [关于我们](${abs("/md/about")}): 公司介绍`,
    "",
    "## 站点信息",
    "",
    `- 网页版: ${SITE.url}`,
    `- 全站 Markdown 合集: [llms-full.txt](${abs("/llms-full.txt")})`,
    `- Markdown 索引: [md/](${abs("/md")})`,
    `- 站点地图: [sitemap.xml](${abs("/sitemap.xml")})`,
    "",
    `## 可选`,
    "",
    `- [产品服务说明](${abs("/md/products")}) [${SITE.name} 产品]`,
    `- [公司介绍](${abs("/md/about")}) [关于 ${SITE.name}]`,
  ];
  return parts.join("\n");
}

/** Markdown 板块索引 (列出所有 .md 路由)。 */
export function mdIndex(): string {
  const fm = frontmatter({
    title: `${SITE.name} Markdown 索引`,
    description: `${SITE.name} 全部 Markdown 内容入口。`,
    url: abs("/md"),
    source: SITE.name,
  });
  const parts: string[] = [
    fm,
    "",
    `# ${SITE.name} Markdown 索引`,
    "",
    "以下是本站所有 Markdown 版本内容, 供 AI 搜索引擎与开发者使用。",
    "",
    "## 板块",
    "",
    `- [产品与服务](${abs("/md/products")})`,
    `- [新闻动态](${abs("/md/news")})`,
    `- [团队](${abs("/md/team")})`,
    `- [合作伙伴](${abs("/md/partners")})`,
    `- [关于我们](${abs("/md/about")})`,
    "",
    "## 站点级",
    "",
    `- [llms.txt](${abs("/llms.txt")}) — 站点总览`,
    `- [llms-full.txt](${abs("/llms-full.txt")}) — 全站合集`,
    `- [sitemap.xml](${abs("/sitemap.xml")})`,
  ];
  return parts.join("\n");
}

/**
 * llms-full.txt: 全站内容合集 (一个文件含所有板块的完整 Markdown)。
 * 适合给 AI 一次性消化整站。
 */
export function llmsFullTxt(opts: {
  products: ProductDetail[];
  articles: Article[];
  partners: Partner[];
  team: TeamMember[];
  about?: { title: string; content: string };
}): string {
  const { products, articles, partners, team, about } = opts;
  const parts: string[] = [
    `# ${SITE.name} — 全站内容合集`,
    "",
    `> ${SITE.description}`,
    "",
    `本文档汇总 ${SITE.name} 全部内容的 Markdown 版本。生成时间: ${new Date().toISOString()}`,
    "",
    "---",
    "",
  ];

  if (products.length) {
    parts.push("# 产品与服务", "");
    for (const p of products) {
      parts.push(productToMd(p), "", "---", "");
    }
  }
  if (articles.length) {
    parts.push("# 新闻动态", "");
    for (const a of articles) {
      parts.push(articleToMd(a), "", "---", "");
    }
  }
  if (partners.length) {
    parts.push(partnerListToMd(partners), "", "---", "");
  }
  if (team.length) {
    parts.push(teamListToMd(team), "", "---", "");
  }
  if (about) {
    parts.push(aboutToMd(about.title, about.content), "", "---", "");
  }

  return parts.join("\n");
}

// ── Response 辅助 ─────────────────────────────────────────────────────

/** 构造 text/markdown 响应, 统一字符集与缓存头。 */
export function mdResponse(body: string, opts: { maxAge?: number } = {}): Response {
  const maxAge = opts.maxAge ?? 300;
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": `s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
