import Link from "next/link";
import type { Article, Partner, Product, TeamMember } from "@/lib/types";

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

/** 产品卡片: 深色玻璃卡 + 顶部 hover 光线 + 主图/渐变缩略区 */
export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-line bg-surface p-5 no-underline shadow-card backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-400/30 hover:bg-raised hover:shadow-card-hover"
    >
      {/* 顶部 hover 光线 */}
      <span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      {/* 顶部缩略区: 有主图显示主图, 否则渐变背景 */}
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.name}
          className="mb-4 aspect-video w-full rounded-lg border border-line object-cover"
        />
      ) : (
        <div className="mb-4 grid aspect-video place-items-center rounded-lg border border-brand-400/10 bigcard-bg font-display text-sm font-semibold text-brandtext">
          {product.category || "产品"}
        </div>
      )}
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
  );
}

/** 团队成员卡片: 深色玻璃卡 + 头像微光描边 */
export function TeamCard({ member }: { member: TeamMember }) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = member.avatar && member.avatar.trim() !== "" ? member.avatar : avatarFallback;
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 text-center shadow-card backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-400/20 hover:shadow-card-hover">
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
    </div>
  );
}

/** 合作方徽标卡片: 渐变首字方块 + 深色玻璃 */
export function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <div className="group flex flex-col items-center justify-center rounded-2xl border border-line bg-surface p-6 text-center shadow-card backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-400/30 hover:shadow-card-hover">
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 font-display text-lg font-bold text-white shadow-glow-sm transition-transform group-hover:scale-105">
        {partner.name.slice(0, 1)}
      </div>
      <p className="mt-3 font-display font-medium text-strong">{partner.name}</p>
      {(partner.industry || partner.level) && (
        <p className="mt-1 text-xs text-faint">
          {[partner.industry, partner.level].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

/** 文章卡片: 深色玻璃 + 顶部 hover 光线 + 分类徽章 */
export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/news/${article.slug || article.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5 no-underline shadow-card backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-400/30 hover:bg-raised hover:shadow-card-hover"
    >
      {/* 顶部 hover 光线 */}
      <span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="mb-2.5 flex items-center gap-2 text-xs text-faint">
        {article.category?.name && (
          <span className="rounded-md border border-brand-400/20 bg-brand-500/10 px-2 py-0.5 font-medium text-brandtext">
            {article.category.name}
          </span>
        )}
        {article.created_at && <time>{new Date(article.created_at).toLocaleDateString("zh-CN")}</time>}
      </div>
      <h3 className="font-display font-semibold text-strong transition-colors group-hover:text-brandtext">
        {article.title}
      </h3>
      {article.summary && <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">{article.summary}</p>}
    </Link>
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
