"use client";

import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArticleCard } from "@/components/articles/article-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";

interface ProductsContentProps {
  products: Array<{
    id: string;
    title: string;
    excerpt: string;
    coverImage?: string;
    slug: string;
    createdAt: string;
  }>;
  totalPages: number;
  page: number;
}

export function ProductsContent({
  products,
  totalPages,
  page,
}: ProductsContentProps) {
  return (
    <>
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/50 py-24 lg:py-32">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute right-1/4 top-1/4 h-96 w-96 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-transparent blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-3xl text-center"
            >
              <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-blue-200/50">
                产品中心
              </div>
              <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
                选择适合您的
                <span className="mt-2 block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  客户管理方案
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                无论是初创团队还是大型企业，我们都有适合您的解决方案。
                灵活的版本选择，让您按需付费，轻松上手。
              </p>
            </motion.div>
          </div>
        </section>

        {/* 产品列表 */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {products.length > 0 ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {products.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <ArticleCard article={product} />
                    </motion.div>
                  ))}
                </motion.div>

                {/* 分页 */}
                {totalPages > 1 && (
                  <div className="mt-12 flex justify-center">
                    <div className="flex items-center gap-2">
                      {page > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-slate-300 bg-white/80 text-slate-700 backdrop-blur-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Link href={`/products?page=${page - 1}`}>
                            上一页
                          </Link>
                        </Button>
                      )}

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(
                            (p) =>
                              p === 1 ||
                              p === totalPages ||
                              (p >= page - 1 && p <= page + 1)
                          )
                          .map((p, i, arr) => {
                            const prev = arr[i - 1];
                            const showEllipsis = prev && p > prev + 1;

                            return (
                              <div key={p}>
                                {showEllipsis && (
                                  <span className="px-2 text-slate-400">...</span>
                                )}
                                <Button
                                  variant={p === page ? "default" : "outline"}
                                  size="sm"
                                  asChild={p !== page}
                                  className={
                                    p === page
                                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                                      : "border-slate-300 bg-white/80 text-slate-700 backdrop-blur-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                                  }
                                  {...(p === page && { asChild: false })}
                                >
                                  {p !== page ? (
                                    <Link href={`/products?page=${p}`}>{p}</Link>
                                  ) : (
                                    <span>{p}</span>
                                  )}
                                </Button>
                              </div>
                            );
                          })}
                      </div>

                      {page < totalPages && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-slate-300 bg-white/80 text-slate-700 backdrop-blur-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Link href={`/products?page=${page + 1}`}>
                            下一页
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mx-auto max-w-2xl text-center"
              >
                <div className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
                  <ChevronRight className="h-12 w-12 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  暂无产品展示
                </h2>
                <p className="mt-4 text-lg text-slate-600">
                  我们正在更新产品信息，敬请期待。
                </p>
              </motion.div>
            )}
          </div>
        </section>

        {/* 版本对比 */}
        <section className="relative overflow-hidden bg-slate-50 py-24">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />

          <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-3xl text-center"
            >
              <h2 className="text-3xl font-heading font-bold tracking-tight text-slate-900 sm:text-4xl">
                版本对比
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                选择最适合您企业的版本
              </p>
            </motion.div>

            <div className="mx-auto mt-16 max-w-6xl">
              <div className="grid gap-8 lg:grid-cols-3">
                {/* 基础版 */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-slate-900">
                        基础版
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        适合初创团队
                      </p>
                    </div>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-slate-900">
                          ¥99
                        </span>
                        <span className="text-slate-500">/月</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        支持 5 人以下团队
                      </p>
                    </div>
                    <ul className="mb-8 space-y-3">
                      {[
                        "客户信息管理",
                        "跟进记录",
                        "基础报表",
                        "邮件支持",
                      ].map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-sm text-slate-700"
                        >
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      className="w-full border-slate-300 bg-white/80 text-slate-700 backdrop-blur-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                      asChild
                    >
                      <Link href="/contact">联系销售</Link>
                    </Button>
                  </div>
                </motion.div>

                {/* 专业版 */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="relative h-full rounded-2xl border-2 border-blue-500 bg-white p-8 shadow-xl shadow-blue-500/10">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1 text-sm font-medium text-white shadow-lg">
                        推荐
                      </span>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-slate-900">
                        专业版
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        适合成长型企业
                      </p>
                    </div>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-slate-900">
                          ¥299
                        </span>
                        <span className="text-slate-500">/月</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        支持 20-100 人团队
                      </p>
                    </div>
                    <ul className="mb-8 space-y-3">
                      {[
                        "客户信息管理",
                        "智能客户分配",
                        "销售漏斗管理",
                        "高级数据分析",
                        "权限管理",
                        "在线客服支持",
                      ].map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-sm text-slate-700"
                        >
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105"
                      asChild
                    >
                      <Link href="/contact">立即咨询</Link>
                    </Button>
                  </div>
                </motion.div>

                {/* 企业版 */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-slate-900">
                        企业版
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        适合大型企业
                      </p>
                    </div>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-slate-900">
                          定制
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        根据需求定制方案
                      </p>
                    </div>
                    <ul className="mb-8 space-y-3">
                      {[
                        "专业版全部功能",
                        "私有化部署",
                        "定制开发",
                        "专属客户经理",
                        "7×24 小时支持",
                        "培训服务",
                      ].map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-sm text-slate-700"
                        >
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      className="w-full border-slate-300 bg-white/80 text-slate-700 backdrop-blur-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                      asChild
                    >
                      <Link href="/contact">联系销售</Link>
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-heading font-bold tracking-tight text-slate-900 sm:text-4xl">
                不确定哪个版本适合您？
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                我们的专业顾问团队将根据您的企业规模和业务需求，
                为您推荐最合适的解决方案。
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105"
                  asChild
                >
                  <Link href="/contact">
                    免费咨询
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-300 bg-white/80 text-slate-700 backdrop-blur-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                  asChild
                >
                  <Link href="/cases">查看客户案例</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
