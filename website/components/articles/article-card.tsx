import Link from "next/link";
import { Calendar, User } from "lucide-react";
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
            href={`/articles/${article.slug}`}
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
        </div>
      </CardFooter>
    </Card>
  );
}
