import Link from "next/link";
import type { ReactNode } from "react";
import { getArticles, getHomepageConfig, getSiteConfig } from "@/lib/api";
import { ArticleCard, PartnerCard, ProductCard, TeamCard } from "@/components/Cards";
import { EmptyState } from "@/components/EmptyState";
import { SITE } from "@/lib/site";
import type { HomepageSectionItem, ModuleEntry, Partner, Product, StatEntry, TeamMember } from "@/lib/types";

// 首页 ISR: 每 5 分钟重新生成, 兼顾实时数据与性能。
export const revalidate = 300;

/** 安全解析 JSON 数组配置(数字带/模块墙);解析失败或为空返回 [], 对应区块不渲染。 */
function parseStats(json?: string): StatEntry[] {
  if (!json) return [];
  try {
    const arr: unknown = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((s): s is StatEntry => Boolean(s?.num && s?.label)) : [];
  } catch {
    return [];
  }
}
function parseModules(json?: string): ModuleEntry[] {
  if (!json) return [];
  try {
    const arr: unknown = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((m): m is ModuleEntry => Boolean(m?.name)) : [];
  } catch {
    return [];
  }
}

// 将首页配置返回的通用条目映射为卡片所需的类型。
function toProduct(item: HomepageSectionItem): Product {
  return {
    id: item.id,
    name: item.name,
    product_no: "",
    category: item.category || "",
    unit: "",
    standard_price: "0",
    status: 1,
    image_url: item.image_url || "",
    description: item.description || "",
  };
}
function toPartner(item: HomepageSectionItem): Partner {
  return { id: item.id, name: item.name, level: item.level || "", industry: item.industry || "", source: item.source || "" };
}
function toTeamMember(item: HomepageSectionItem): TeamMember {
  return { id: item.id, nickname: item.name, avatar: item.avatar || "", position: item.position || "" };
}

/* ── 模块墙图标: 线性 SVG (stroke 风格, 24x24) ── */
function Icon({ children, className = "h-5 w-5" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  fileCheck: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="m9 15 2 2 4-4" />
    </>
  ),
  box: (
    <>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </>
  ),
  wallet: (
    <>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </>
  ),
  idCard: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <circle cx="8" cy="10" r="2" />
      <path d="M5.5 16c.5-1.5 1.5-2 2.5-2s2 .5 2.5 2" />
      <path d="M14 9h5" />
      <path d="M14 13h5" />
    </>
  ),
  calendar: (
    <>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  kanban: (
    <>
      <path d="M5 4v13" />
      <path d="M12 4v7" />
      <path d="M19 4v16" />
      <path d="M3 4h18" />
    </>
  ),
  book: (
    <>
      <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
    </>
  ),
  cloud: <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />,
  megaphone: (
    <>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>
  ),
  bag: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z" />
      <path d="M19 3v3" />
      <path d="M20.5 4.5h-3" />
    </>
  ),
};

/** 模块墙图标查找: icon key 来自站点配置 modules_json, 未知 key 回退 users。 */
function iconOf(key?: string): ReactNode {
  return ICONS[(key as keyof typeof ICONS) || "users"] ?? ICONS.users;
}

/** 章节标题: badge + 标题 + 描述 + 右侧「查看全部」 */
function SectionHead({
  badge,
  title,
  desc,
  moreHref,
}: {
  badge: string;
  title: string;
  desc?: string;
  moreHref?: string;
}) {
  return (
    <div className="fade-in-up mb-10 flex items-end justify-between gap-4">
      <div>
        <span className="section-badge">{badge}</span>
        <h2 className="mt-3.5 font-display text-2xl font-bold text-strong sm:text-3xl">{title}</h2>
        {desc && <p className="mt-2 text-muted">{desc}</p>}
      </div>
      {moreHref && (
        <Link
          href={moreHref}
          className="shrink-0 text-sm font-medium text-muted no-underline transition-colors hover:text-brandtext"
        >
          查看全部 →
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  // 并行拉取首页板块配置 + 新闻 + 站点配置。
  // 首页配置接口返回各板块的开关状态和精选条目详情;
  // 接口失败时降级为空(不渲染对应板块)。
  const [homeCfg, newsRes, siteCfg] = await Promise.all([
    getHomepageConfig().catch(() => null),
    getArticles({ page_size: 4 }).catch(() => ({ list: [], total: 0 })),
    getSiteConfig().catch(() => null),
  ]);

  // Hero 区域配置(从站点配置读,留空回退到站点名称/描述)
  const heroBadge = siteCfg?.hero_badge || "企业级业务管理平台";
  const heroTitle = siteCfg?.hero_title || siteCfg?.site_name || SITE.name;
  const heroSubtitle = siteCfg?.hero_subtitle || siteCfg?.description
    || `${SITE.description}。即时的产品、团队与合作客户信息, 数据来源于业务系统实时同步。`;

  // 从首页配置中提取各板块数据(产品最多展示排头 6 项,其余通过「查看全部」进入单页)
  const showProducts = homeCfg?.product?.enabled !== false;
  const showPartners = homeCfg?.partner?.enabled !== false;
  const showTeam = homeCfg?.team?.enabled !== false;

  const products = (homeCfg?.product?.items ?? []).slice(0, 6).map(toProduct);
  const partners = homeCfg?.partner?.items?.map(toPartner) ?? [];
  const team = homeCfg?.team?.items?.map(toTeamMember) ?? [];

  // 数字带/模块墙/CTA: 站点配置驱动, 留空则不渲染或回退中性文案
  const stats = parseStats(siteCfg?.stats_json);
  const modules = parseModules(siteCfg?.modules_json);
  const bigModule = modules.find((m) => m.big);
  const smallModules = bigModule ? modules.filter((m) => m !== bigModule) : modules;
  const ctaTitle = siteCfg?.cta_title || "联系我们, 开启合作";
  const ctaHighlight = siteCfg?.cta_highlight || "";
  const ctaSubtitle = siteCfg?.cta_subtitle || "留下您的联系方式, 我们会尽快与您沟通需求。";

  return (
    <>
      {/* Hero: 深蓝黑底 + 网格 + 顶部光晕 + 大标题 + 数字带 */}
      <section className="hero-mesh relative overflow-hidden">
        <div className="hero-grid absolute inset-0" aria-hidden="true" />
        <div className="container relative pb-20 pt-24 text-center sm:pb-28 sm:pt-32">
          <span className="fade-in-up inline-flex items-center rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brandtext backdrop-blur-sm">
            <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
            {heroBadge}
          </span>
          <h1 className="fade-in-up delay-100 mx-auto mt-7 max-w-4xl font-display text-4xl font-extrabold leading-[1.2] tracking-tight text-strong sm:text-5xl md:text-6xl md:leading-[1.15]">
            {heroTitle}
          </h1>
          <p className="fade-in-up delay-200 mx-auto mt-6 max-w-2xl text-base leading-8 text-muted sm:text-lg">
            {heroSubtitle}
          </p>
          <div className="fade-in-up delay-300 mt-10 flex flex-wrap justify-center gap-4">
            {showProducts && (
              <Link
                href="/products"
                className="rounded-lg bg-gradient-to-r from-brand-500 to-brand-700 px-7 py-3 text-sm font-semibold text-white no-underline shadow-glow-sm transition-all hover:-translate-y-0.5 hover:shadow-glow"
              >
                查看产品
              </Link>
            )}
            <Link
              href="/about"
              className="rounded-lg border border-line bg-raised px-7 py-3 text-sm font-semibold text-normal no-underline backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-400/40 hover:text-strong"
            >
              了解我们
            </Link>
          </div>

          {/* 数字带: 硬指标, 配置为空则不渲染 */}
          {stats.length > 0 && (
            <div
              className="fade-in-up delay-400 mx-auto mt-16 grid max-w-2xl gap-4 sm:mt-20 sm:gap-8"
              style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))` }}
            >
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                    <span className="text-gradient">{s.num}</span>
                  </p>
                  <p className="mt-1.5 text-xs text-faint sm:text-sm">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 模块墙: bento 网格, 配置为空则不渲染;big 标记的项为大卡 */}
      {modules.length > 0 && (
        <section className="container py-20 sm:py-24">
          <SectionHead
            badge="一体化能力"
            title="一个系统, 装下企业的全部业务"
            desc="模块自由组合, 数据天然打通 — 告别在多个系统之间来回切换"
          />
          <div className="grid auto-flow-dense grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {bigModule && (
              <div className="group relative col-span-2 row-span-2 overflow-hidden rounded-2xl border border-brand-400/20 bigcard-bg p-6 shadow-card transition-all duration-200 hover:border-brand-400/40 hover:shadow-card-hover sm:p-8">
                <div className="glow-orb -right-16 -top-16 h-48 w-48 bg-brand-500/20" aria-hidden="true" />
                <div className="relative">
                  <span className="inline-grid h-12 w-12 place-items-center rounded-xl border border-brand-400/30 bg-brand-500/15 text-brandtext shadow-glow-sm">
                    <Icon className="h-6 w-6">{iconOf(bigModule.icon)}</Icon>
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold text-strong sm:text-2xl">{bigModule.name}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-7 text-muted">{bigModule.desc}</p>
                  {bigModule.pills && bigModule.pills.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {bigModule.pills.map((pill) => (
                        <span
                          key={pill}
                          className="rounded-full border border-brand-400/20 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brandtext"
                        >
                          {pill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {smallModules.map((m) => (
              <div
                key={m.name}
                className="group rounded-2xl border border-line bg-surface p-5 shadow-card backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-400/30 hover:bg-raised hover:shadow-card-hover"
              >
                <span className="inline-grid h-10 w-10 place-items-center rounded-lg border border-line bg-raised text-brandtext transition-colors group-hover:border-brand-400/30 group-hover:bg-brand-500/15">
                  <Icon>{iconOf(m.icon)}</Icon>
                </span>
                <h3 className="mt-4 font-display text-sm font-semibold text-strong sm:text-base">{m.name}</h3>
                <p className="mt-1 text-xs leading-5 text-faint sm:text-[13px] sm:leading-6">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 产品精选 */}
      {showProducts && (
        <section className="border-y border-line bg-alt py-20 sm:py-24">
          <div className="container">
            <SectionHead badge="产品与服务" title="即时的产品信息" desc="来源于业务系统实时同步" moreHref="/products" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
              {products.length > 0 ? (
                products.map((p) => <ProductCard key={p.id} product={p} />)
              ) : (
                <EmptyState text="暂无产品数据" />
              )}
            </div>
          </div>
        </section>
      )}

      {/* 合作伙伴 */}
      {showPartners && (
        <section className="container py-20 sm:py-24">
          <SectionHead badge="合作伙伴" title="他们正在使用" desc="我们服务的客户" moreHref="/partners" />
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
            {partners.length > 0 ? (
              partners.map((p) => <PartnerCard key={p.id} partner={p} />)
            ) : (
              <EmptyState text="暂无合作方数据" />
            )}
          </div>
        </section>
      )}

      {/* 团队 */}
      {showTeam && (
        <section className="border-y border-line bg-alt py-20 sm:py-24">
          <div className="container">
            <SectionHead badge="我们的团队" title="专业的人, 做专业的事" desc="为您服务" moreHref="/team" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4">
              {team.length > 0 ? (
                team.map((m) => <TeamCard key={m.id} member={m} />)
              ) : (
                <EmptyState text="暂无团队成员" />
              )}
            </div>
          </div>
        </section>
      )}

      {/* 新闻动态 */}
      <section className="container py-20 sm:py-24">
        <SectionHead badge="新闻动态" title="最新资讯" desc="产品动态与技术实践" moreHref="/news" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {newsRes.list.length > 0 ? (
            newsRes.list.map((a) => <ArticleCard key={a.id} article={a} />)
          ) : (
            <EmptyState text="暂无新闻" />
          )}
        </div>
      </section>

      {/* CTA 收尾: 光晕 + 大标题 + 行动按钮 */}
      <section className="relative overflow-hidden border-t border-line">
        <div className="glow-orb left-1/2 top-0 h-64 w-[42rem] -translate-x-1/2 bg-brand-500/15" aria-hidden="true" />
        <div className="container relative py-24 text-center sm:py-28">
          <h2 className="fade-in-up mx-auto max-w-2xl font-display text-3xl font-extrabold leading-tight text-strong sm:text-4xl">
            {ctaTitle}
            {ctaHighlight && <span className="text-gradient"> {ctaHighlight} </span>}
          </h2>
          <p className="fade-in-up delay-100 mx-auto mt-4 max-w-xl text-muted">
            {ctaSubtitle}
          </p>
          <div className="fade-in-up delay-200 mt-9 flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="rounded-lg bg-gradient-to-r from-brand-500 to-brand-700 px-8 py-3.5 text-sm font-semibold text-white no-underline shadow-glow-sm transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              联系我们
            </Link>
            <Link
              href="/products"
              className="rounded-lg border border-line bg-raised px-8 py-3.5 text-sm font-semibold text-normal no-underline backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-400/40 hover:text-strong"
            >
              先看看产品
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
