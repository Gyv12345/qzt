import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getContentBySlug, getProfiles } from "@/lib/api";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, User, Tag, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600; // ISR: 每小时重新生成

// 静态生成所有人员路径
export async function generateStaticParams() {
  try {
    const { data: profiles } = await getProfiles({ pageSize: 100 });
    return profiles.slice(0, 20).map((profile: { slug: string }) => ({
      slug: profile.slug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const profile = await getContentBySlug(slug);
    return {
      title: `${profile.metaTitle || profile.title} - 企智通`,
      description: profile.metaDesc || profile.excerpt,
      keywords: profile.keywords,
    };
  } catch {
    return {
      title: "团队成员 - 企智通",
    };
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let profile;
  try {
    profile = await getContentBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="min-h-screen py-16">
        <article className="mx-auto max-w-3xl px-6 lg:px-8">
          {/* 人员头部 */}
          <header className="mb-8">
            <div className="flex items-start gap-6">
              {/* 头像 */}
              {profile.coverImage && (
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profile.coverImage}
                    alt={profile.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-4xl font-heading font-bold md:text-5xl">
                  {profile.title}
                </h1>
                {profile.userProfile?.name && profile.userProfile.name !== profile.title && (
                  <p className="mt-1 text-lg text-muted-foreground">
                    {profile.userProfile.name}
                  </p>
                )}
              </div>
            </div>

            {/* 元信息 */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              {profile.publishedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={profile.publishedAt}>
                    {new Date(profile.publishedAt).toLocaleDateString("zh-CN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </div>
              )}
              {profile.author && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{profile.author.username}</span>
                </div>
              )}
            </div>

            {/* 标签 */}
            {profile.tags && profile.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {profile.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {/* 联系方式区块 - 仅当有关联用户时显示 */}
          {profile.userProfile && (profile.userProfile.email || profile.userProfile.phone) && (
            <div className="my-8 rounded-xl border bg-muted/30 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5" />
                联系方式
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {profile.userProfile.email && (
                  <a
                    href={`mailto:${profile.userProfile.email}`}
                    className="flex items-center gap-3 rounded-lg bg-background p-4 transition-colors hover:bg-muted"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">邮箱</span>
                      <p className="font-medium">{profile.userProfile.email}</p>
                    </div>
                  </a>
                )}
                {profile.userProfile.phone && (
                  <a
                    href={`tel:${profile.userProfile.phone}`}
                    className="flex items-center gap-3 rounded-lg bg-background p-4 transition-colors hover:bg-muted"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">电话</span>
                      <p className="font-medium">{profile.userProfile.phone}</p>
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* 人员摘要 */}
          {profile.excerpt && (
            <p className="text-xl text-muted-foreground">{profile.excerpt}</p>
          )}

          {/* 封面图（如果没有作为头像显示） */}
          {profile.coverImage && (
            <div className="my-8 aspect-video w-full overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.coverImage}
                alt={profile.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* 人员详情内容 */}
          <div
            className="prose prose-slate max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: profile.content }}
          />

          {/* 元数据 */}
          <footer className="mt-12 border-t pt-8 text-sm text-muted-foreground">
            <p>
              发布于{" "}
              {new Date(profile.createdAt).toLocaleDateString("zh-CN")}
              {profile.updatedAt !== profile.createdAt &&
                ` · 更新于 ${new Date(profile.updatedAt).toLocaleDateString("zh-CN")}`}
            </p>
          </footer>
        </article>
      </main>
      <Footer />
    </>
  );
}
