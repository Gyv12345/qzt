"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/Cards";
import { EmptyState } from "@/components/EmptyState";
import type { Product, ProductCategory } from "@/lib/types";

interface Props {
  products: Product[];
  categories: ProductCategory[];
}

interface Selection {
  top: string; // 一级分类名, "" = 全部
  leaf: string; // 叶子分类名, "" = 该一级下不细分
}

/** 由 ?cat= 推导两级选中态; cat 不在分类树内时回落「全部」。 */
function deriveFromCat(cat: string, categories: ProductCategory[]): Selection {
  if (!cat) return { top: "", leaf: "" };
  for (const top of categories) {
    if (top.name === cat) return { top: cat, leaf: "" };
    if ((top.children ?? []).some((c) => c.name === cat)) return { top: top.name, leaf: cat };
  }
  return { top: "", leaf: "" };
}

/** 统计挂在该一级分类下的产品数(直接挂一级 + 挂其子分类)。 */
function countUnder(products: Product[], top: ProductCategory): number {
  const names = new Set((top.children ?? []).map((c) => c.name));
  return products.filter((p) => p.category === top.name || names.has(p.category)).length;
}

function Grid({ list }: { list: Product[] }) {
  if (list.length === 0) return <EmptyState text="暂无产品数据" />;
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
      {list.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

/**
 * 产品列表客户端筛选(静态导出兼容):
 * 数据由构建期 SSG 全量传入, 本组件只做纯客户端过滤与 URL 同步,
 * 不发起任何请求; ?cat= 通过 pushState 更新, 不触发页面刷新。
 */
export default function ProductsBrowser({ products, categories }: Props) {
  const searchParams = useSearchParams();
  const cat = searchParams.get("cat") ?? "";
  const [selected, setSelected] = useState<Selection>({ top: "", leaf: "" });

  // 构建期 useSearchParams 为空串, 客户端挂载后为真实 query; 路由状态变化时同步选中态
  useEffect(() => {
    setSelected(deriveFromCat(cat, categories));
  }, [cat, categories]);

  // 浏览器前进/后退兜底(与 useSearchParams 同步双保险)
  useEffect(() => {
    const onPop = () =>
      setSelected(deriveFromCat(new URLSearchParams(window.location.search).get("cat") ?? "", categories));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [categories]);

  // 切分类: 本地 setState 即时生效, pushState 写回 ?cat= (全部分类时移除参数); 重复点击不重复入栈
  const select = useCallback((top: string, leaf: string) => {
    setSelected((prev) => {
      if (prev.top === top && prev.leaf === leaf) return prev;
      const url = new URL(window.location.href);
      url.searchParams.delete("cat");
      const value = leaf || top;
      if (value) url.searchParams.set("cat", value);
      window.history.pushState(null, "", url);
      return { top, leaf };
    });
  }, []);

  const activeTop = useMemo(() => categories.find((c) => c.name === selected.top), [categories, selected]);
  const childNames = useMemo(() => new Set((activeTop?.children ?? []).map((c) => c.name)), [activeTop]);

  // 筛选: 选叶子按叶子名精确匹配; 只选一级时兼容直接挂一级的产品(含其子分类)
  const filtered = useMemo(() => {
    if (!selected.top) return products;
    if (selected.leaf) return products.filter((p) => p.category === selected.leaf);
    return products.filter((p) => p.category === selected.top || childNames.has(p.category));
  }, [products, selected, childNames]);

  // 构建期分类接口不可用: 退化为纯产品网格(不渲染筛选)
  if (categories.length === 0) {
    return (
      <section className="container py-16">
        <Grid list={products} />
      </section>
    );
  }

  const children = activeTop?.children ?? [];

  return (
    <section className="container py-16">
      {/* 一级分类横向 Tab */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="产品一级分类">
        <Pill small={false} active={!selected.top} label="全部" count={products.length} onClick={() => select("", "")} />
        {categories.map((t) => (
          <Pill
            key={t.id}
            small={false}
            active={selected.top === t.name}
            label={t.name}
            count={countUnder(products, t)}
            onClick={() => select(t.name, "")}
          />
        ))}
      </div>
      {/* 子分类胶囊(仅当前一级有子分类时渲染; 无子分类的一级直接作为单枚举) */}
      {children.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="产品子分类">
          <Pill
            small
            active={!selected.leaf}
            label="全部"
            count={countUnder(products, activeTop as ProductCategory)}
            onClick={() => select(selected.top, "")}
          />
          {children.map((c) => (
            <Pill
              key={c.id}
              small
              active={selected.leaf === c.name}
              label={c.name}
              count={products.filter((p) => p.category === c.name).length}
              onClick={() => select(selected.top, c.name)}
            />
          ))}
        </div>
      )}

      <div className="mt-8">
        {filtered.length > 0 ? (
          <Grid list={filtered} />
        ) : (
          <EmptyState text={selected.top ? `「${selected.leaf || selected.top}」分类下暂无产品` : "暂无产品数据"} />
        )}
      </div>
    </section>
  );
}

/** 筛选按钮: 一级 Tab(大)与子分类胶囊(小)共用, 选项带计数 */
function Pill({
  label,
  count,
  active,
  small,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  small: boolean;
  onClick: () => void;
}) {
  const size = small ? "px-3.5 py-1.5 text-xs" : "px-5 py-2 text-sm";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border font-medium transition-colors ${size} ${
        active
          ? "border-brand-400 bg-brand-500 text-white"
          : "border-line bg-surface text-muted hover:bg-raised hover:text-strong"
      }`}
    >
      {label}
      <span className={`ml-1.5 ${active ? "text-white/70" : "text-faint"}`}>{count}</span>
    </button>
  );
}
