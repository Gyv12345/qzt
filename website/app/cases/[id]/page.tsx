import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getContractById, getCompletedContracts } from "@/lib/api";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Calendar,
  Building2,
  DollarSign,
  FileText,
  Package,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600;

// 静态生成热门案例路径
export async function generateStaticParams() {
  try {
    const { data: contracts } = await getCompletedContracts({ pageSize: 100 });
    return contracts.slice(0, 20).map((contract) => ({
      id: contract.id,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const contract = await getContractById(id);
    return {
      title: `${contract.customer.name} - 客户案例 - 企智通`,
      description: `了解 ${contract.customer.name} 如何通过企智通实现业务增长，合同金额 ¥${contract.totalAmount.toLocaleString("zh-CN")}`,
    };
  } catch {
    return {
      title: "案例详情 - 企智通",
    };
  }
}

// 格式化金额
function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString("zh-CN")}`;
}

// 格式化日期
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 格式化日期范围
function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月 - ${endDate.getFullYear()}年${endDate.getMonth() + 1}月`;
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let contract;
  try {
    contract = await getContractById(id);
  } catch {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="min-h-screen py-16">
        <article className="mx-auto max-w-4xl px-6 lg:px-8">
          {/* 案例头部 */}
          <header className="mb-8">
            <div className="mb-4">
              <Badge variant="outline" className="text-xs">
                客户案例
              </Badge>
            </div>
            <h1 className="text-4xl font-heading font-bold md:text-5xl">
              {contract.customer.name}
            </h1>

            {/* 元信息 */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>合同编号：{contract.contractNo}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{contract.customer.shortName || contract.customer.name}</span>
              </div>
            </div>
          </header>

          {/* 项目概览卡片 */}
          <div className="mb-8 rounded-xl border bg-gradient-to-br from-blue-50 to-purple-50 p-6 dark:from-blue-950/20 dark:to-purple-950/20">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <Package className="h-5 w-5" />
              项目概览
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {/* 合同金额 */}
              <div className="rounded-lg bg-white/60 p-4 backdrop-blur-sm dark:bg-white/10">
                <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  合同金额
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatAmount(contract.totalAmount)}
                </p>
                {contract.originalAmount !== contract.totalAmount && (
                  <p className="mt-1 text-xs text-muted-foreground line-through">
                    原价 {formatAmount(contract.originalAmount)}
                  </p>
                )}
              </div>

              {/* 服务周期 */}
              <div className="rounded-lg bg-white/60 p-4 backdrop-blur-sm dark:bg-white/10">
                <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  服务周期
                </div>
                <p className="text-lg font-semibold">
                  {formatDateRange(contract.serviceStart, contract.serviceEnd)}
                </p>
              </div>

              {/* 合作状态 */}
              <div className="rounded-lg bg-white/60 p-4 backdrop-blur-sm dark:bg-white/10">
                <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  合作状态
                </div>
                <p className="flex items-center gap-2 text-lg font-semibold text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  已完成
                </p>
              </div>
            </div>
          </div>

          {/* 产品明细 */}
          <div className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Package className="h-5 w-5" />
              服务内容
            </h2>
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      产品名称
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      数量
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      单价
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      小计
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contract.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          {item.product.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {item.product.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        {item.actualPrice !== item.originalPrice ? (
                          <div>
                            <p className="font-medium text-green-600">
                              {formatAmount(item.actualPrice)}
                            </p>
                            <p className="text-xs text-muted-foreground line-through">
                              {formatAmount(item.originalPrice)}
                            </p>
                          </div>
                        ) : (
                          formatAmount(item.originalPrice)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatAmount(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-medium">
                      合计
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-green-600">
                      {formatAmount(contract.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 备注 */}
          {contract.remark && (
            <div className="mb-8 rounded-xl border bg-muted/30 p-6">
              <h3 className="mb-2 font-semibold">备注</h3>
              <p className="text-muted-foreground">{contract.remark}</p>
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 rounded-xl bg-muted/50 p-8 text-center">
            <h3 className="text-2xl font-heading font-bold">
              想要实现类似的成功？
            </h3>
            <p className="mt-2 text-muted-foreground">
              联系我们，了解企智通如何帮助您的业务增长
            </p>
            <a
              href="/contact"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              联系销售团队
            </a>
          </div>

          {/* 文章元数据 */}
          <footer className="mt-12 border-t pt-8 text-sm text-muted-foreground">
            <p>创建于 {formatDate(contract.createdAt)}</p>
          </footer>
        </article>
      </main>
      <Footer />
    </>
  );
}
