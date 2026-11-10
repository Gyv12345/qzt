import Link from "next/link";
import type { ReactNode } from "react";
import { getArticles, getHomepageConfig, getSiteConfig } from "@/lib/api";
import { ArticleCard, PartnerCard, ProductCard, TeamCard } from "@/components/Cards";
import { EmptyState } from "@/components/EmptyState";
import Aurora from "@/components/reactbits/Aurora";
import BlurText from "@/components/reactbits/BlurText";
import DotGrid from "@/components/reactbits/DotGrid";
import GradientText from "@/components/reactbits/GradientText";
import ShinyText from "@/components/reactbits/ShinyText";
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
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </>
  ),
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </>
  ),
  smartphone: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" />
    </>
  ),
  tablet: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M12 18h.01" />
    </>
  ),
  layers: (
    <>
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </>
  ),
  messageCircle: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
};

/** 服务范围: 六端承接(公司核心能力, 硬编码——这是公司定位, 不随后台配置变化) */
const SERVICES: { icon: keyof typeof ICONS; name: string; desc: string }[] = [
  { icon: "database", name: "后端开发", desc: "Java · Spring 全家桶 · 微服务 · Docker, 2014 年起 12 年后端功底" },
  { icon: "monitor", name: "Web 前端", desc: "React · Vue · Next.js, 管理后台、官网与数据大屏" },
  { icon: "smartphone", name: "iOS", desc: "Swift / SwiftUI 原生应用, App Store 上架全流程" },
  { icon: "tablet", name: "Android", desc: "Kotlin + Compose 原生应用, 主流应用市场发布" },
  { icon: "layers", name: "鸿蒙 HarmonyOS", desc: "ArkTS 原生应用, 适配纯血鸿蒙生态" },
  { icon: "messageCircle", name: "微信小程序", desc: "原生 / uni-app / 云开发, 免服务器方案可选" },
];

/** 年末福利定价(硬编码, 与 FAQ/关于页口径一致: 2026 年底前签约有效) */
const PRICING = [
  {
    name: "软件定制开发",
    price: "300",
    unit: "元/人天",
    tag: "年末福利价",
    highlight: true,
    desc: "按人天计价, 小预算也能启动。MVP 几千元起, 从想法到上线。",
    items: ["需求梳理与技术方案", "原型设计与开发", "测试、部署与上线", "源码完整交付"],
  },
  {
    name: "行简交钥匙部署",
    price: "1000",
    unit: "元 · 一次性",
    tag: "开源平台",
    highlight: false,
    desc: "开源一体化管理平台(MIT 协议), 软件授权费为零。",
    items: ["CRM/进销存/财务/HRM/OA 等 13 模块", "服务器环境搭建与部署上线", "数据初始化与使用培训", "私有化部署, 数据归企业所有"],
  },
  {
    name: "维保服务",
    price: "1000",
    unit: "元 / 3 个月",
    tag: "持续保障",
    highlight: false,
    desc: "上线不是终点, 保障持续稳定使用。",
    items: ["问题第一时间响应与修复", "小调整与配置优化", "运行状态巡检", "续保灵活按需"],
  },
];

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

  // 数字带/优势网格/CTA: 站点配置驱动, 留空则不渲染或回退中性文案
  const stats = parseStats(siteCfg?.stats_json);
  const modules = parseModules(siteCfg?.modules_json);
  const modulesBadge = siteCfg?.modules_badge || "核心优势";
  const modulesTitle = siteCfg?.modules_title || "为什么选择我们";
  const modulesDesc = siteCfg?.modules_desc || "";
  const ctaTitle = siteCfg?.cta_title || "联系我们, 开启合作";
  const ctaHighlight = siteCfg?.cta_highlight || "";
  const ctaSubtitle = siteCfg?.cta_subtitle || "留下您的联系方式, 我们会尽快与您沟通需求。";

  return (
    <>
      {/* Hero: 深蓝黑底 + 交互式点阵(React Bits DotGrid, 鼠标滑过点亮/推动) + 大标题 + 数字带 */}
      <section className="hero-mesh relative overflow-hidden">
        <div
          className="absolute inset-0 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_40%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_40%,transparent_100%)]"
          aria-hidden="true"
        >
          <DotGrid
            dotSize={3}
            gap={28}
            baseColor="#16324f"
            activeColor="#599dd6"
            proximity={140}
            shockRadius={220}
            shockStrength={4}
          />
        </div>
        <div className="container relative pb-20 pt-24 text-center sm:pb-28 sm:pt-32">
          <span className="fade-in-up inline-flex items-center rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brandtext backdrop-blur-sm">
            <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
            <ShinyText text={heroBadge} speed={3} delay={2} color="var(--c-brand-text)" shineColor="var(--c-strong)" />
          </span>
          <h1 className="fade-in-up delay-100 mx-auto mt-7 max-w-4xl font-display text-4xl font-extrabold leading-[1.2] tracking-tight sm:text-5xl md:text-6xl md:leading-[1.15]">
            <GradientText
              as="span"
              colors={["var(--c-grad-from)", "var(--c-grad-via)", "var(--c-grad-to)"]}
              animationSpeed={8}
            >
              {heroTitle}
            </GradientText>
          </h1>
          <BlurText
            text={heroSubtitle}
            animateBy="characters"
            delay={25}
            className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted sm:text-lg"
            style={{ justifyContent: "center" }}
          />
          <div className="fade-in-up delay-300 mt-10 flex flex-wrap justify-center gap-4">
            {showProducts && (
              <Link
                href="/products"
                className="rounded-lg bg-gradient-to-r from-brand-500 to-brand-700 px-7 py-3 text-sm font-semibold text-white no-underline shadow-glow-sm transition-all hover:-translate-y-0.5 hover:shadow-glow"
              >
                看看案例
              </Link>
            )}
            <Link
              href="/contact"
              className="rounded-lg border border-line bg-raised px-7 py-3 text-sm font-semibold text-normal no-underline backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-400/40 hover:text-strong"
            >
              聊聊你的想法
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

      {/* 服务范围: 六端承接(公司核心能力) */}
      <section className="container py-20 sm:py-24">
        <SectionHead
          badge="我们能做什么"
          title="全端承接的软件定制开发"
          desc="一个团队, 覆盖软件落地的全部环节: 需求、原型、开发、部署、上线"
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {SERVICES.map((s) => (
            <div
              key={s.name}
              className="group rounded-2xl border border-line bg-surface p-5 shadow-card backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-400/30 hover:bg-raised hover:shadow-card-hover"
            >
              <span className="inline-grid h-10 w-10 place-items-center rounded-lg border border-line bg-raised text-brandtext transition-colors group-hover:border-brand-400/30 group-hover:bg-brand-500/15">
                <Icon>{ICONS[s.icon]}</Icon>
              </span>
              <h3 className="mt-4 font-display text-sm font-semibold text-strong sm:text-base">{s.name}</h3>
              <p className="mt-1 text-xs leading-5 text-faint sm:text-[13px] sm:leading-6">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-5 py-2.5 text-sm font-medium text-normal no-underline transition-colors hover:border-brand-400/40 hover:text-brandtext"
          >
            查看各服务的做法、价格与周期 →
          </Link>
        </div>
      </section>

      {/* 优势网格: icon+标题+描述小卡, 配置为空则不渲染(通用区块, 各行业客户皆可填自身优势) */}
      {modules.length > 0 && (
        <section className="container py-20 sm:py-24">
          <SectionHead badge={modulesBadge} title={modulesTitle} desc={modulesDesc || undefined} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {modules.map((m) => (
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

      {/* 年末福利定价: 透明报价, 口径与 FAQ/关于页一致 */}
      <section className="border-y border-line bg-alt py-20 sm:py-24">
        <div className="container">
          <SectionHead
            badge="年末福利"
            title="300 元/人天, 把想法做出来"
            desc="2026 年底前签约有效 · 需求沟通与技术方案评估免费"
          />
          <div className="grid gap-5 md:grid-cols-3">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col rounded-2xl border p-6 shadow-card backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 ${
                  p.highlight
                    ? "border-brand-400/40 bg-surface shadow-glow-sm hover:shadow-glow"
                    : "border-line bg-surface hover:border-brand-400/20 hover:shadow-card-hover"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-strong">{p.name}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      p.highlight ? "bg-brand-500/15 text-brandtext" : "bg-raised text-faint"
                    }`}
                  >
                    {p.tag}
                  </span>
                </div>
                <p className="mt-4 font-display text-3xl font-extrabold tracking-tight">
                  <span className="text-gradient">¥{p.price}</span>
                  <span className="ml-1.5 text-sm font-normal text-faint">{p.unit}</span>
                </p>
                <p className="mt-2 text-xs leading-5 text-muted sm:text-[13px]">{p.desc}</p>
                <ul className="mt-4 flex flex-1 flex-col gap-2 text-xs text-muted sm:text-[13px]">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-start gap-2">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden="true" />
                      {it}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className={`mt-6 rounded-lg px-5 py-2.5 text-center text-sm font-semibold no-underline transition-all hover:-translate-y-0.5 ${
                    p.highlight
                      ? "bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-glow-sm hover:shadow-glow"
                      : "border border-line bg-raised text-normal hover:border-brand-400/40 hover:text-strong"
                  }`}
                >
                  获取报价
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 产品精选 */}
      {showProducts && (
        <section className="border-y border-line bg-alt py-20 sm:py-24">
          <div className="container">
            <SectionHead badge="产品与案例" title="自研产品与交付案例" desc="行简开源平台 · 精选交付案例, 数据实时同步" moreHref="/products" />
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

      {/* CTA 收尾: 极光背景(React Bits Aurora) + 光晕 + 大标题 + 行动按钮 */}
      <section className="relative overflow-hidden border-t border-line">
        <div className="absolute inset-0 opacity-70" aria-hidden="true">
          <Aurora colorStops={["#0f4c81", "#357cbf", "#8ec0e6"]} amplitude={1.1} blend={0.5} />
        </div>
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
