import type { ReactNode } from "react";

/** 列表/单页共享页头: 标题 + 副标题 + 装饰下划线。
 *  统一各列表页手写的 <header className="mb-10 text-center">, 消除样式漂移。 */
export function PageHeader({
  title,
  subtitle,
  mb = "mb-10",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  mb?: string;
}) {
  return (
    <header className={`text-center ${mb}`}>
      <h1 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-3 text-ink-500">{subtitle}</p>}
      {/* 装饰下划线 */}
      <span className="mx-auto mt-3.5 block h-[3px] w-12 rounded-full bg-gradient-to-r from-brand-600 to-brand-400" />
    </header>
  );
}
