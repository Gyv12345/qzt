"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 py-24 text-white md:py-32">
      {/* 动画背景元素 */}
      {!shouldReduceMotion && (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl"
          />
        </>
      )}

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h1 className="text-4xl font-heading font-bold md:text-6xl lg:text-7xl">
            企业客户管理
            <span className="block text-blue-200">新时代的智能选择</span>
          </h1>
          <p className="mt-6 text-lg text-blue-100 md:text-xl">
            企账通为您提供一站式企业客户关系管理解决方案，
            助力企业实现数字化转型，提升运营效率。
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50"
              asChild
            >
              <a href="#contact">
                免费试用 30 天 <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              asChild
            >
              <a href="/demo">观看演示</a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
