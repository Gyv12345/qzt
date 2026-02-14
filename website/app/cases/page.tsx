import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getCompletedContracts, type PublicContract, type PaginatedResponse } from "@/lib/api";
import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Calendar, DollarSign, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "客户案例 - 企智通",
  description: "了解我们如何帮助客户实现业务增长",
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

// 格式化金额
function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString("zh-CN")}`;
}

// 格式化日期范围
function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.getFullYear()}.${String(startDate.getMonth() + 1).padStart(2, "0")} - ${endDate.getFullYear()}.${String(endDate.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  let contracts: PublicContract[] = [];
  let total = 0;
  let totalPages = 1;

  try {
    const result = (await getCompletedContracts({
      page,
      pageSize: 12,
    })) as PaginatedResponse<PublicContract>;
    contracts = result.data;
    total = result.total;
    totalPages = result.totalPages;
  } catch (error) {
    console.error("Failed to fetch contracts:", error);
  }

  return (
    <>
      <Header />
      <main className="min-h-screen py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-heading font-bold md:text-4xl">
              客户案例
            </h1>
            <p className="mt-4 text-muted-foreground">
              了解我们如何帮助客户实现业务增长
            </p>
          </div>

          {contracts.length > 0 ? (
            <>
              <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {contracts.map((contract) => (
                  <Link
                    key={contract.id}
                    href={`/cases/${contract.id}`}
                    className="group block h-full"
                  >
                    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
                      {/* 客户信息 */}
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {contract.customer.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {contract.contractNo}
                          </p>
                        </div>
                      </div>

                      {/* 合同详情 */}
                      <div className="flex-1 space-y-3">
                        {/* 产品明细 */}
                        {contract.items.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {contract.items.slice(0, 3).map((item) => (
                              <span
                                key={item.id}
                                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                              >
                                {item.product.name}
                              </span>
                            ))}
                            {contract.items.length > 3 && (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                                +{contract.items.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 服务周期 */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDateRange(contract.serviceStart, contract.serviceEnd)}</span>
                        </div>

                        {/* 合同金额 */}
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-600">
                            {formatAmount(contract.totalAmount)}
                          </span>
                        </div>
                      </div>

                      {/* 查看详情 */}
                      <div className="mt-4 flex items-center text-sm font-medium text-blue-600 opacity-0 transition-all duration-300 group-hover:opacity-100">
                        查看详情
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* 分页组件 */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                  {page > 1 && (
                    <a
                      href={`/cases?page=${page - 1}`}
                      className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      上一页
                    </a>
                  )}
                  <span className="flex items-center px-4 text-sm text-muted-foreground">
                    第 {page} / {totalPages} 页（共 {total} 条）
                  </span>
                  {page < totalPages && (
                    <a
                      href={`/cases?page=${page + 1}`}
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
                暂无案例，敬请期待更多精彩内容。
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
