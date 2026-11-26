import { SITE } from "@/lib/site";

/**
 * Hero 产品截图: 浏览器拟真框(三点 chrome + 地址栏) + 玻璃描边 + 底部渐变光晕。
 * 图源 = 站点配置 hero_shot_url(后台「官网设置→首页产品截图」可传), 留空回退内置默认图。
 */
export function HeroShot({ src }: { src?: string }) {
  return (
    <div className="fade-in-up delay-400 relative mx-auto mt-14 w-full max-w-4xl sm:mt-16">
      {/* 底部渐变光晕 */}
      <div
        className="absolute -bottom-10 left-1/2 h-40 w-[80%] -translate-x-1/2 rounded-full bg-brand-500/25 blur-3xl"
        aria-hidden="true"
      />
      {/* 浏览器拟真框: card-sheen 顶部光线 + hover 上浮 */}
      <div className="card-sheen relative overflow-hidden rounded-2xl border border-line bg-deep shadow-card-hover transition-all duration-300 hover:-translate-y-1">
        {/* chrome 条 */}
        <div className="flex items-center border-b border-line bg-alt px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="mx-auto flex items-center gap-1.5 rounded-md border border-line bg-raised px-3 py-1 text-[11px] text-faint">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            admin.devlovecode.com
          </span>
          <span className="w-10" aria-hidden="true" />
        </div>
        {/* 截图主体(真实产品界面) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src || "/assets/admin-dashboard.png"}
          alt={`行简一体化管理平台工作台实时界面: 销售漏斗、客户分布与财务概览 (${SITE.name})`}
          width={1440}
          height={900}
          className="block w-full"
        />
      </div>
    </div>
  );
}
