"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Rocket, Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const benefits = [
  "无需信用卡",
  "5分钟快速部署",
  "24/7技术支持",
  "随时取消",
];

export function CtaSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden py-24">
      {/* 动态背景 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/50" />
        <div className="absolute right-1/4 top-1/4 h-96 w-96 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-transparent blur-3xl" />
        <div className="absolute left-1/4 bottom-1/4 h-96 w-96 translate-y-1/2 rounded-full bg-gradient-to-tr from-purple-400/20 via-pink-400/20 to-transparent blur-3xl" />

        {/* 网格背景 */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* 左侧：主要内容 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 text-sm font-medium text-blue-700 ring-1 ring-blue-200/50">
              <Rocket className="h-4 w-4" />
              限时优惠 - 立即体验
            </div>

            <h2 className="mt-6 text-3xl font-heading font-bold tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
              准备好开启
              <span className="mt-2 block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                数字化转型
              </span>
              了吗？
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              加入数千家企业的选择，让企智通助您实现业务增长。
              立即注册，享受 30 天免费试用，无需信用卡。
            </p>

            {/* 优势列表 */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-2 text-slate-700"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm font-medium">{benefit}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA 按钮 */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                className="group relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105"
                asChild
              >
                <a href="/signup">
                  <span className="relative z-10">免费开始使用</span>
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-300 bg-white/80 text-slate-700 backdrop-blur-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                asChild
              >
                <a href="/contact">联系销售</a>
              </Button>
            </div>
          </motion.div>

          {/* 右侧：卡片展示 */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
            className="relative"
          >
            <div className="relative">
              {/* 主卡片 */}
              <div className="relative glass rounded-3xl border border-white/60 p-8 shadow-2xl">
                {/* 顶部装饰 */}
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/25">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">30 天免费试用</div>
                    <div className="text-sm text-slate-500">无需绑定信用卡</div>
                  </div>
                </div>

                {/* 功能列表 */}
                <div className="space-y-4">
                  {[
                    { label: "客户管理", included: true },
                    { label: "数据分析", included: true },
                    { label: "智能沟通", included: true },
                    { label: "API 访问", included: true },
                    { label: "专属客服", included: false },
                  ].map((item, index) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-2"
                    >
                      <span className={`text-sm ${item.included ? "text-slate-700" : "text-slate-400"}`}>
                        {item.label}
                      </span>
                      {item.included ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">企业版</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 底部价格 */}
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-slate-900">¥0</span>
                    <span className="text-slate-500">/30天</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    试用结束后可升级到付费计划
                  </p>
                </div>
              </div>

              {/* 浮动元素 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: 0.3 }}
                className="absolute -right-8 -top-8 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-10 w-10 rounded-full border-2 border-white bg-gradient-to-br from-slate-200 to-slate-300"
                        style={{ zIndex: 3 - i }}
                      />
                    ))}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">10,000+</div>
                    <div className="text-xs text-slate-500">企业已加入</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
