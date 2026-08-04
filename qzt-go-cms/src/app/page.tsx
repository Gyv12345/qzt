import Link from "next/link";
import { getArticles, getPartners, getProducts, getTeam } from "@/lib/api";
import { ArticleCard, PartnerCard, ProductCard, TeamCard } from "@/components/Cards";
import { EmptyState } from "@/components/EmptyState";
import { SITE } from "@/lib/site";

// 首页 ISR: 每 5 分钟重新生成, 兼顾实时数据与性能。
export const revalidate = 300;

export default async function HomePage() {
  // 并行拉取各板块数据。任一接口失败不阻断整页, 该板块降级为空。
  const [productsRes, partnersRes, teamRes, newsRes] = await Promise.all([
    getProducts({ page_size: 6 }).catch(() => ({ list: [], total: 0 })),
    getPartners({ page_size: 8 }).catch(() => ({ list: [], total: 0 })),
    getTeam({ page_size: 4 }).catch(() => ({ list: [], total: 0 })),
    getArticles({ page_size: 4 }).catch(() => ({ list: [], total: 0 })),
  ]);

  return (
    <>
      {/* Hero: 几何网格底纹 + 渐变 mesh + 大标题层次 */}
      <section className="hero-mesh relative overflow-hidden">
        <div className="hero-grid absolute inset-0" aria-hidden="true" />
        <div className="container relative py-24 text-center sm:py-32">
          {/* 小标签 */}
          <span className="fade-in-up inline-block rounded-full border border-brand-200 bg-white/60 px-4 py-1.5 text-xs font-medium text-brand-700 backdrop-blur-sm">
            企业级业务管理平台
          </span>
          <h1 className="fade-in-up delay-100 mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-5xl md:text-6xl">
            {SITE.name}
          </h1>
          <p className="fade-in-up delay-200 mx-auto mt-6 max-w-2xl text-lg leading-8 text-ink-500 sm:text-xl">
            {SITE.description}。即时的产品、团队与合作客户信息, 数据来源于业务系统实时同步。
          </p>
          <div className="fade-in-up delay-300 mt-10 flex justify-center gap-4">
            <Link
              href="/products"
              className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-7 py-3 text-sm font-semibold text-white no-underline shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              查看产品
            </Link>
            <Link
              href="/about"
              className="rounded-lg border border-ink-200 bg-white/80 px-7 py-3 text-sm font-semibold text-ink-700 no-underline backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700"
            >
              了解我们
            </Link>
          </div>
        </div>
      </section>

      {/* 产品精选 */}
      <section className="container py-20">
        <div className="fade-in-up mb-10 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">产品与服务</h2>
            <p className="mt-2 text-ink-500">即时的产品信息, 来源于业务系统</p>
          </div>
          <Link href="/products" className="text-sm font-medium no-underline hover:text-brand-dark">
            查看全部 →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          {productsRes.list.length > 0 ? (
            productsRes.list.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <EmptyState text="暂无产品数据" />
          )}
        </div>
      </section>

      {/* 合作伙伴 */}
      <section className="bg-ink-50/50 py-20">
        <div className="container">
          <div className="fade-in-up mb-10 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">合作伙伴</h2>
              <p className="mt-2 text-ink-500">我们服务的客户</p>
            </div>
            <Link href="/partners" className="text-sm font-medium no-underline hover:text-brand-dark">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
            {partnersRes.list.length > 0 ? (
              partnersRes.list.map((p) => <PartnerCard key={p.id} partner={p} />)
            ) : (
              <EmptyState text="暂无合作方数据" />
            )}
          </div>
        </div>
      </section>

      {/* 团队 */}
      <section className="container py-20">
        <div className="fade-in-up mb-10 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">我们的团队</h2>
            <p className="mt-2 text-ink-500">专业的人才, 为您服务</p>
          </div>
          <Link href="/team" className="text-sm font-medium no-underline hover:text-brand-dark">
            查看全部 →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4">
          {teamRes.list.length > 0 ? (
            teamRes.list.map((m) => <TeamCard key={m.id} member={m} />)
          ) : (
            <EmptyState text="暂无团队成员" />
          )}
        </div>
      </section>

      {/* 新闻动态 */}
      <section className="bg-ink-50/50 py-20">
        <div className="container">
          <div className="fade-in-up mb-10 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">新闻动态</h2>
              <p className="mt-2 text-ink-500">最新资讯</p>
            </div>
            <Link href="/news" className="text-sm font-medium no-underline hover:text-brand-dark">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {newsRes.list.length > 0 ? (
              newsRes.list.map((a) => <ArticleCard key={a.id} article={a} />)
            ) : (
              <EmptyState text="暂无新闻" />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
