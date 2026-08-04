import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero-mesh relative grid place-items-center overflow-hidden py-32 text-center">
      <div className="hero-grid absolute inset-0" aria-hidden="true" />
      <div className="container relative">
        {/* 渐变大号 404 */}
        <p className="font-display text-7xl font-extrabold sm:text-8xl">
          <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">404</span>
        </p>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900">页面未找到</h1>
        <p className="mt-2 text-ink-500">您访问的页面不存在或已被移除。</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3 text-sm font-semibold text-white no-underline shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          返回首页
        </Link>
      </div>
    </section>
  );
}
