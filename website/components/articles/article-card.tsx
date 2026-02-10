import Link from "next/link";
import { Calendar, User, Building2, Package, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CmsContent } from "@/lib/api";

interface ArticleCardProps {
  article: CmsContent;
}

export function ArticleCard({ article }: ArticleCardProps) {
  // 根据内容类型生成正确的链接
  const getHref = () => {
    switch (article.contentType) {
      case "ARTICLE":
        return `/articles/${article.slug}`;
      case "CASE_STUDY":
        return `/cases/${article.slug}`;
      case "PRODUCT_SHOWCASE":
        // 产品展示内容链接到产品详情页（如果有关联产品）
        return article.product?.code
          ? `/products/${article.product.code}`
          : `/products/${article.slug}`;
      case "PROFILE":
        return `/profiles/${article.slug}`;
      default:
        return `/`;
    }
  };

  // 根据内容类型获取图标
  const getTypeIcon = () => {
    switch (article.contentType) {
      case "CASE_STUDY":
        return Building2;
      case "PRODUCT_SHOWCASE":
        return Package;
      case "PROFILE":
        return UserCircle;
      default:
        return null;
    }
  };

  const TypeIcon = getTypeIcon();

  return (
    <Card className="h-full transition-all hover:shadow-lg hover:shadow-blue-500/10">
      <CardHeader>
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {article.tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
        <CardTitle className="line-clamp-2">
          <Link
            href={getHref()}
            className="hover:text-primary"
          >
            {article.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-3">
          {article.excerpt}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {article.coverImage && (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.coverImage}
              alt={article.title}
              className="h-full w-full object-cover transition-transform hover:scale-105"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          {article.publishedAt && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <time dateTime={article.publishedAt}>
                {new Date(article.publishedAt).toLocaleDateString("zh-CN")}
              </time>
            </div>
          )}
          {article.author && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{article.author.username}</span>
            </div>
          )}
          {TypeIcon && (
            <div className="ml-auto">
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
