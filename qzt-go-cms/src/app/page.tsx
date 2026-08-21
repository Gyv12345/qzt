import Link from "next/link";
import type { ReactNode } from "react";
import { getArticles, getHomepageConfig, getSiteConfig } from "@/lib/api";
import { ArticleCard, PartnerCard, ProductCard, TeamCard } from "@/components/Cards";
import { EmptyState } from "@/components/EmptyState";
import { SITE } from "@/lib/site";
import type { HomepageSectionItem, Partner, Product, TeamMember } from "@/lib/types";

// 首页 ISR: 每 5 分钟重新生成, 兼顾实时数据与性能。
export const revalidate = 300;

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

/** 13 个业务模块: 产品事实, 写死而非配置驱动。第一个为 bento 大卡。 */
const MODULES: { icon: ReactNode; name: string; desc: string; pills?: string[] }[] = [
  {
    icon: ICONS.users,
    name: "CRM 客户管理",
    desc: "从线索到回款, 客户全生命周期在一个地方闭环。",
    pills: ["线索", "公海", "商机", "合同", "回款"],
  },
  { icon: ICONS.fileCheck, name: "审批流", desc: "自定义表单与流程引擎" },
  { icon: ICONS.box, name: "进销存", desc: "采购·销售·库存一体" },
  { icon: ICONS.wallet, name: "财务", desc: "收支·发票·资金流水" },
  { icon: ICONS.idCard, name: "HRM 人事", desc: "组织·考勤·薪酬" },
  { icon: ICONS.calendar, name: "OA 办公", desc: "公告·日程·报销借款" },
  { icon: ICONS.kanban, name: "项目管理", desc: "任务·看板·里程碑" },
  { icon: ICONS.book, name: "知识库", desc: "文档沉淀与协作" },
  { icon: ICONS.cloud, name: "企业云盘", desc: "文件统一存储管理" },
  { icon: ICONS.megaphone, name: "营销线索", desc: "抖音飞鱼线索自动入库" },
  { icon: ICONS.bag, name: "独立商城", desc: "下单自动生成销售单" },
  { icon: ICONS.globe, name: "CMS 官网", desc: "官网内容与页面管理" },
  { icon: ICONS.sparkles, name: "AI 集成 (MCP)", desc: "411+ API 全量开放给 AI 助手" },
];

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
        <h2 className="mt-3.5 font-display text-2xl font-bold text-white sm:text-3xl">{title}</h2>
        {desc && <p className="mt-2 text-slate-400">{desc}</p>}
      </div>
      {moreHref && (
        <Link
          href={moreHref}
          className="shrink-0 text-sm font-medium text-slate-400 no-underline transition-colors hover:text-brand-300"
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

  const [crm, ...restModules] = MODULES;

  return (
    <>
      {/* Hero: 深蓝黑底 + 网格 + 顶部光晕 + 大标题 + 数字带 */}
      <section className="hero-mesh relative overflow-hidden">
        <div className="hero-grid absolute inset-0" aria-hidden="true" />
        <div className="container relative pb-20 pt-24 text-center sm:pb-28 sm:pt-32">
          <span className="fade-in-up inline-flex items-center rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brand-300 backdrop-blur-sm">
            <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-300" />
            {heroBadge}
          </span>
          <h1 className="fade-in-up delay-100 mx-auto mt-7 max-w-4xl font-display text-4xl font-extrabold leading-[1.2] tracking-tight text-white sm:text-5xl md:text-6xl md:leading-[1.15]">
            {heroTitle}
          </h1>
          <p className="fade-in-up delay-200 mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
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
              className="rounded-lg border border-white/10 bg-white/[0.04] px-7 py-3 text-sm font-semibold text-slate-200 no-underline backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-400/40 hover:text-white"
            >
              了解我们
            </Link>
          </div>

          {/* 数字带: 用硬指标撑住信任感 */}
          <div className="fade-in-up delay-400 mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-4 sm:mt-20 sm:gap-8">
            {[
              { num: "13", label: "业务模块一体化" },
              { num: "411+", label: "API 接口" },
              { num: "123", label: "数据表架构" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                  <span className="text-gradient">{s.num}</span>
                </p>
                <p className="mt-1.5 text-xs text-slate-500 sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 模块墙: bento 网格, 大卡 + 12 小卡 */}
      <section className="container py-20 sm:py-24">
        <SectionHead
          badge="全模块一体化"
          title="一个系统, 装下企业的全部业务"
          desc="模块自由组合, 数据天然打通 — 告别在多个 SaaS 之间来回切换"
        />
        <div className="grid auto-flow-dense grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {/* CRM 大卡: 跨 2 行 2 列 */}
          <div className="group relative col-span-2 row-span-2 overflow-hidden rounded-2xl border border-brand-400/20 bg-gradient-to-br from-brand-900/50 via-night-850 to-night-850 p-6 shadow-card transition-all duration-200 hover:border-brand-400/40 hover:shadow-card-hover sm:p-8">
            <div className="glow-orb -right-16 -top-16 h-48 w-48 bg-brand-500/20" aria-hidden="true" />
            <div className="relative">
              <span className="inline-grid h-12 w-12 place-items-center rounded-xl border border-brand-400/30 bg-brand-500/15 text-brand-300 shadow-glow-sm">
                <Icon className="h-6 w-6">{crm.icon}</Icon>
              </span>
              <h3 className="mt-5 font-display text-xl font-bold text-white sm:text-2xl">{crm.name}</h3>
              <p className="mt-2 max-w-sm text-sm leading-7 text-slate-400">{crm.desc}</p>
              {crm.pills && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {crm.pills.map((pill) => (
                    <span
                      key={pill}
                      className="rounded-full border border-brand-400/20 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-200"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {restModules.map((m) => (
            <div
              key={m.name}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 shadow-card backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-400/30 hover:bg-white/[0.05] hover:shadow-card-hover"
            >
              <span className="inline-grid h-10 w-10 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-brand-300 transition-colors group-hover:border-brand-400/30 group-hover:bg-brand-500/15">
                <Icon>{m.icon}</Icon>
              </span>
              <h3 className="mt-4 font-display text-sm font-semibold text-white sm:text-base">{m.name}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-[13px] sm:leading-6">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 产品精选 */}
      {showProducts && (
        <section className="border-y border-white/[0.05] bg-night-900/40 py-20 sm:py-24">
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
        <section className="border-y border-white/[0.05] bg-night-900/40 py-20 sm:py-24">
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
      <section className="relative overflow-hidden border-t border-white/[0.05]">
        <div className="glow-orb left-1/2 top-0 h-64 w-[42rem] -translate-x-1/2 bg-brand-500/15" aria-hidden="true" />
        <div className="container relative py-24 text-center sm:py-28">
          <h2 className="fade-in-up mx-auto max-w-2xl font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            准备把业务搬进
            <span className="text-gradient"> 一个系统 </span>?
          </h2>
          <p className="fade-in-up delay-100 mx-auto mt-4 max-w-xl text-slate-400">
            私有化部署, 数据完全归企业所有。留下联系方式, 我们来聊聊您的场景。
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
              className="rounded-lg border border-white/10 bg-white/[0.04] px-8 py-3.5 text-sm font-semibold text-slate-200 no-underline backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-400/40 hover:text-white"
            >
              先看看产品
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
