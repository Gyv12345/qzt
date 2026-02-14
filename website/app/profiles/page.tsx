import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getActiveUsers, type PublicUser, type PaginatedResponse } from "@/lib/api";
import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "团队成员 - 企智通",
  description: "认识我们的专业团队",
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ProfilesPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  let users: PublicUser[] = [];
  let total = 0;
  let totalPages = 1;

  try {
    const result = (await getActiveUsers({
      page,
      pageSize: 12,
    })) as PaginatedResponse<PublicUser>;
    users = result.data;
    total = result.total;
    totalPages = result.totalPages;
  } catch (error) {
    console.error("Failed to fetch users:", error);
  }

  return (
    <>
      <Header />
      <main className="min-h-screen py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-heading font-bold md:text-4xl">
              团队成员
            </h1>
            <p className="mt-4 text-muted-foreground">
              认识我们的专业团队
            </p>
          </div>

          {users.length > 0 ? (
            <>
              <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10"
                  >
                    {/* 头像 */}
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-3xl font-bold text-white shadow-lg">
                        {user.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>

                    {/* 姓名 */}
                    <h3 className="text-center text-xl font-bold text-slate-900">
                      {user.name}
                    </h3>

                    {/* 部门 */}
                    {user.department && (
                      <p className="mt-1 text-center text-sm text-muted-foreground">
                        {user.department.name}
                      </p>
                    )}

                    {/* 角色 */}
                    {user.roles.length > 0 && (
                      <div className="mt-3 flex flex-wrap justify-center gap-1">
                        {user.roles.map(({ role }) => (
                          <span
                            key={role.id}
                            className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                          >
                            {role.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 联系方式 */}
                    <div className="mt-auto pt-4 text-center text-sm text-muted-foreground">
                      {user.email && (
                        <div className="flex items-center justify-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      )}
                      {user.phone && (
                        <div className="mt-1 flex items-center justify-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 分页组件 */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                  {page > 1 && (
                    <a
                      href={`/profiles?page=${page - 1}`}
                      className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      上一页
                    </a>
                  )}
                  <span className="flex items-center px-4 text-sm text-muted-foreground">
                    第 {page} / {totalPages} 页（共 {total} 人）
                  </span>
                  {page < totalPages && (
                    <a
                      href={`/profiles?page=${page + 1}`}
                      className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      下一页
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="mt-12 text-center">
              <p className="text-muted-foreground">
                暂无团队成员信息，敬请期待。
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
