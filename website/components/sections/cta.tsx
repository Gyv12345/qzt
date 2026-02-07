"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export function CtaSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-16 sm:px-12 sm:py-24 lg:px-16"
        >
          {/* 背景装饰 */}
          <div className="absolute inset-0 -z-10">
            <Sparkles className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 text-white/10" />
            <Sparkles className="absolute bottom-0 left-0 h-64 w-64 translate-y-1/2 -translate-x-1/2 text-white/10" />
          </div>

          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-heading font-bold text-white sm:text-4xl">
              准备好开启数字化转型了吗？
            </h2>
            <p className="mt-6 text-lg text-blue-100">
              加入数千家企业的选择，让企账通助您实现业务增长。
              立即注册，享受 30 天免费试用。
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50"
                asChild
              >
                <a href="/signup">
                  免费开始使用 <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                asChild
              >
                <a href="/contact">联系销售</a>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
