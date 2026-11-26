import Link from "next/link";
import type { Article, Partner, Product, TeamMember } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const avatarFallback =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#357cbf'/><stop offset='1' stop-color='#0a3a63'/></linearGradient></defs><rect width='80' height='80' fill='url(#g)'/><text x='50%' y='52%' font-size='32' fill='#fff' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif' font-weight='700'>Q</text></svg>`
  );

/** 卡片摘要: 去掉 markdown 语法符号, 只留纯文本。 */
function stripMarkdown(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*`_~|-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 产品卡片: ui/Card 玻璃卡(hover 上浮+亮边) + card-sheen 顶部 hover 光线(CSS 接管)
 * + 主图 hover 缩放(渐变兜底块共用同款容器)。
 * 卡面整体可点击: Card 做壳, Link 包全部内容保留 a 语义(SEO)。
 */
export function ProductCard({ product }: { product: Product }) {
  return (
    <Card hover className="card-sheen overflow-hidden">
      {/* p-5 放在 Link 上: 整卡可点击(含内边距区), Card 只做玻璃壳 */}
      <Link href={`/products/${product.id}`} className="block p-5 no-underline">
        {/* 顶部缩略区: 有主图显示主图(hover 缩放), 否则渐变兜底块; 容器统一裁切圆角 */}
        <div className="mb-4 overflow-hidden rounded-lg border border-line">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid aspect-video place-items-center bigcard-bg font-display text-sm font-semibold text-brandtext">
              {product.category || "产品"}
            </div>
          )}
        </div>
        <h3 className="font-display font-semibold text-strong transition-colors group-hover:text-brandtext">
          {product.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">
          {product.description ? stripMarkdown(product.description) || "暂无描述" : "暂无描述"}
        </p>
        <div className="mt-3.5 flex items-center justify-between">
          <span className="text-xs text-faint">{product.product_no || "—"}</span>
          {Number(product.standard_price) > 0 && (
            <span className="font-display text-sm font-bold text-accent-light">¥{product.standard_price}</span>
          )}
        </div>
      </Link>
    </Card>
  );
}

/** 团队成员卡片: ui/Card 玻璃卡 + 头像微光描边 */
export function TeamCard({ member }: { member: TeamMember }) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = member.avatar && member.avatar.trim() !== "" ? member.avatar : avatarFallback;
  return (
    <Card hover className="p-5 text-center">
      {/* 静态站点优先,使用普通 img 避免 next/image 配置负担 */}
      <img
        src={img}
        alt={member.nickname}
        className="mx-auto h-20 w-20 rounded-full object-cover ring-2 ring-brand-400/30 ring-offset-2 ring-offset-canvas"
        width={80}
        height={80}
      />
      <h3 className="mt-3.5 font-display font-semibold text-strong">{member.nickname}</h3>
      <p className="mt-1 text-sm text-muted">{member.position || "团队成员"}</p>
    </Card>
  );
}

/** 合作方徽标卡片: 渐变首字方块 + ui/Card 玻璃卡 */
export function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <Card hover className="flex flex-col items-center justify-center p-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 font-display text-lg font-bold text-white shadow-glow-sm transition-transform group-hover:scale-105">
        {partner.name.slice(0, 1)}
      </div>
      <p className="mt-3 font-display font-medium text-strong">{partner.name}</p>
      {(partner.industry || partner.level) && (
        <p className="mt-1 text-xs text-faint">
          {[partner.industry, partner.level].filter(Boolean).join(" · ")}
        </p>
      )}
    </Card>
  );
}

/** 文章卡片: ui/Card 玻璃卡 + card-sheen 顶部 hover 光线 + 分类徽章 */
export function ArticleCard({ article }: { article: Article }) {
  return (
    <Card hover className="card-sheen overflow-hidden">
      {/* p-5 放在 Link 上: 整卡可点击(含内边距区), Card 只做玻璃壳 */}
      <Link href={`/news/${article.slug || article.id}`} className="flex flex-col p-5 no-underline">
        <div className="mb-2.5 flex items-center gap-2 text-xs text-faint">
          {article.category?.name && <Badge>{article.category.name}</Badge>}
          {article.created_at && <time>{new Date(article.created_at).toLocaleDateString("zh-CN")}</time>}
        </div>
        <h3 className="font-display font-semibold text-strong transition-colors group-hover:text-brandtext">
          {article.title}
        </h3>
        {article.summary && <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">{article.summary}</p>}
      </Link>
    </Card>
  );
}

/** 卡片网格容器。统一列表页 grid 样式, 消除重复。 */
export function CardGrid({
  children,
  cols = "md:grid-cols-3",
}: {
  children: React.ReactNode;
  cols?: string;
}) {
  return <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${cols}`}>{children}</div>;
}
