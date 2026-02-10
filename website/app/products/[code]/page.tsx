import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getProductByCode, getCrProducts } from "@/lib/api";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  DollarSign,
  Package,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const revalidate = 7200; // ISR: 2小时重新生成

// 静态生成所有产品路径
export async function generateStaticParams() {
  try {
    const { data: products } = await getCrProducts({ pageSize: 100 });
    return products.slice(0, 20).map((product) => ({
      code: product.code,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  try {
    const product = await getProductByCode(code);
    return {
      title: `${product.name} - 企智通`,
      description: product.description || `了解${product.name}的详细信息`,
    };
  } catch {
    return {
      title: "产品详情 - 企智通",
    };
  }
}

// 定价类型映射
const PRICING_TYPE_LABELS: Record<string, string> = {
  FIXED: "固定价格",
  TIER_AMOUNT: "按金额阶梯",
  TIER_COUNT: "按次数计费",
  ZERO_DECLARATION: "零申报",
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let product;
  try {
    product = await getProductByCode(code);
  } catch {
    notFound();
  }

  return (
    <>
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/50 py-16 lg:py-24">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <Badge variant="outline" className="mb-4 bg-white/80 backdrop-blur-sm">
                产品详情
              </Badge>
              <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
                {product.name}
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                {product.description}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <div>
                    <span className="text-sm text-slate-500">价格</span>
                    <p className="font-semibold text-slate-900">
                      ¥{product.price.toLocaleString("zh-CN")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm">
                  <Package className="h-5 w-5 text-purple-600" />
                  <div>
                    <span className="text-sm text-slate-500">定价类型</span>
                    <p className="font-semibold text-slate-900">
                      {PRICING_TYPE_LABELS[product.pricingType] || product.pricingType}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 产品详情 */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-3">
              {/* 主要内容 */}
              <div className="lg:col-span-2">
                {/* 产品图片 */}
                {product.image && (
                  <div className="mb-8 aspect-video w-full overflow-hidden rounded-2xl bg-muted shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image.url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* 详细说明 */}
                <div className="prose prose-slate max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold">产品概述</h2>
                  <p>
                    {product.name} 是一款专业的企业管理产品，
                    采用 {PRICING_TYPE_LABELS[product.pricingType] || product.pricingType} 的定价方式，
                    为企业提供灵活高效的管理解决方案。
                  </p>

                  {/* 时间轴（如果有） */}
                  {product.timeline && (
                    <div className="my-8 rounded-xl bg-muted/50 p-6">
                      <h3 className="mb-4 text-xl font-semibold">服务周期</h3>
                      <pre className="whitespace-pre-wrap text-sm">
                        {product.timeline}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* 侧边栏 - 定价信息 */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 rounded-2xl border bg-card p-6 shadow-sm">
                  <h3 className="text-xl font-bold">定价详情</h3>

                  {/* 基础价格 */}
                  <div className="mt-4 border-b pb-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground">基础价格</span>
                      <span className="text-2xl font-bold text-primary">
                        ¥{product.price.toLocaleString("zh-CN")}
                      </span>
                    </div>
                  </div>

                  {/* 阶梯定价规则 */}
                  {product.pricingRules && product.pricingRules.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <span className="text-sm text-muted-foreground">阶梯定价</span>
                      {product.pricingRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">
                              {rule.minQuantity}
                              {rule.maxQuantity ? ` - ${rule.maxQuantity}` : "+"}
                            </span>
                          </div>
                          <span className="font-semibold">
                            ¥{rule.price.toLocaleString("zh-CN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CTA 按钮 */}
                  <div className="mt-6 space-y-3">
                    <Button
                      size="lg"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105"
                      asChild
                    >
                      <Link href="/contact">
                        立即咨询
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full"
                      asChild
                    >
                      <Link href="/cases">查看案例</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 特性说明 */}
        <section className="bg-muted/30 py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-heading font-bold tracking-tight text-slate-900 sm:text-4xl">
                为什么选择我们
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                专业的产品功能，贴心的服务体验
              </p>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "灵活配置", desc: "根据企业需求自定义配置" },
                { title: "安全可靠", desc: "企业级安全保障体系" },
                { title: "专业支持", desc: "7x24小时技术支持" },
                { title: "持续更新", desc: "定期功能更新迭代" },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl bg-white p-6 shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
