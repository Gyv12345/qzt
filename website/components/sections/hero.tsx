"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { CmsPage } from "@/lib/api";

// CMS 内容接口
interface HeroContent {
  title?: string;
  subtitle?: string;
  badge?: string;
  description?: string;
  ctaPrimaryText?: string;
  ctaPrimaryUrl?: string;
  ctaSecondaryText?: string;
  ctaSecondaryUrl?: string;
}

interface HeroSectionProps {
  cmsContent?: {
    content?: string;
    excerpt?: string;
    title?: string;
  } | null;
  pageData?: CmsPage | null;
}

// 默认内容
const defaultHero: HeroContent = {
  badge: "全新升级 · 智能 CRM 系统",
  title: "企业客户管理",
  subtitle: "新时代的智能选择",
  description: "企智通为您提供一站式企业客户关系管理解决方案，助力企业实现数字化转型，提升运营效率。",
  ctaPrimaryText: "免费试用 30 天",
  ctaPrimaryUrl: "#contact",
  ctaSecondaryText: "观看演示",
  ctaSecondaryUrl: "/demo",
};

// 解析 CMS 内容（content 字段存储 JSON）
function parseHeroContent(cmsContent: HeroSectionProps["cmsContent"]): HeroContent {
  if (!cmsContent?.content) return defaultHero;

  try {
    const parsed = JSON.parse(cmsContent.content);
    return {
      badge: parsed.badge || defaultHero.badge,
      title: parsed.title || defaultHero.title,
      subtitle: parsed.subtitle || defaultHero.subtitle,
      description: parsed.description || defaultHero.description,
      ctaPrimaryText: parsed.ctaPrimaryText || defaultHero.ctaPrimaryText,
      ctaPrimaryUrl: parsed.ctaPrimaryUrl || defaultHero.ctaPrimaryUrl,
      ctaSecondaryText: parsed.ctaSecondaryText || defaultHero.ctaSecondaryText,
      ctaSecondaryUrl: parsed.ctaSecondaryUrl || defaultHero.ctaSecondaryUrl,
    };
  } catch {
    return defaultHero;
  }
}

// 从页面数据解析 Hero 内容
function parsePageData(pageData: CmsPage | null | undefined): HeroContent | null {
  if (!pageData?.elements) return null;

  // 查找 HERO 区域的元素
  const heroElements = pageData.elements
    .filter((el) => el.sectionType === "HERO" && el.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (heroElements.length === 0) return null;

  const result: HeroContent = {};

  for (const element of heroElements) {
    try {
      const content = element.content ? JSON.parse(element.content) : {};

      switch (element.elementType) {
        case "heading":
          if (content.text) {
            if (!result.title) result.title = content.text;
            else if (!result.subtitle) result.subtitle = content.text;
          }
          break;
        case "text":
          if (content.text && !result.description) {
            result.description = content.text;
          }
          break;
        case "button":
          if (content.isPrimary && !result.ctaPrimaryText) {
            result.ctaPrimaryText = content.text;
            result.ctaPrimaryUrl = content.url;
          } else if (!content.isPrimary && !result.ctaSecondaryText) {
            result.ctaSecondaryText = content.text;
            result.ctaSecondaryUrl = content.url;
          }
          break;
      }
    } catch {
      // 忽略解析错误
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function HeroSection({ cmsContent, pageData }: HeroSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  // 优先使用页面数据，回退到旧的 PAGE_ELEMENT 方式
  const pageHero = parsePageData(pageData);
  const hero = pageHero || parseHeroContent(cmsContent);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50/30 py-20 md:py-28 lg:py-36">
      {/* 现代感背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* 顶部渐变光晕 */}
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-transparent blur-3xl" />
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-gradient-to-tr from-cyan-400/20 via-blue-400/20 to-transparent blur-3xl" />

        {/* 网格背景 */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
          style={{ maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)" }}
        />

        {/* 浮动装饰元素 */}
        {!shouldReduceMotion && (
          <>
            <motion.div
              animate={{
                y: [0, -20, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute right-[10%] top-[20%] hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-4 backdrop-blur-sm lg:block"
            >
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </motion.div>
            <motion.div
              animate={{
                y: [0, -20, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute left-[8%] bottom-[25%] hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 backdrop-blur-sm lg:block"
            >
              <Sparkles className="h-8 w-8 text-purple-500" />
            </motion.div>
          </>
        )}
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 lg:gap-12 items-center">
          {/* 左侧内容 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.7 }}
            className="text-center lg:text-left"
          >
            {/* 徽章 */}
            {hero.badge && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: 0.1 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 text-sm font-medium text-blue-700 ring-1 ring-blue-200/50"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </span>
                {hero.badge}
              </motion.div>
            )}

            <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl xl:text-7xl">
              {hero.title}
              <span className="mt-2 block bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
                {hero.subtitle}
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.6, delay: 0.2 }}
              className="mt-6 text-lg leading-relaxed text-slate-600 md:text-xl"
            >
              {hero.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: 0.3 }}
              className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start"
            >
              <Button
                size="lg"
                className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105"
                asChild
              >
                <a href={hero.ctaPrimaryUrl || "#contact"}>
                  <span className="relative z-10">{hero.ctaPrimaryText || "免费试用 30 天"}</span>
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="group border-slate-300 bg-white/80 text-slate-700 backdrop-blur-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                asChild
              >
                <a href={hero.ctaSecondaryUrl || "/demo"}>
                  <Play className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                  {hero.ctaSecondaryText || "观看演示"}
                </a>
              </Button>
            </motion.div>

            {/* 信任标识 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.6, delay: 0.4 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 lg:justify-start"
            >
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>无需信用卡</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>5 分钟快速部署</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>24/7 技术支持</span>
              </div>
            </motion.div>
          </motion.div>

          {/* 右侧视觉展示 */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.7, delay: 0.2 }}
            className="relative mt-12 lg:mt-0"
          >
            <div className="relative mx-auto w-full max-w-lg">
              {/* 装饰背景 */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 blur-2xl" />

              {/* 主卡片 */}
              <div className="relative glass rounded-2xl border border-white/50 p-6 shadow-2xl shadow-blue-900/10">
                {/* 顶部工具栏模拟 */}
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                  <div className="ml-4 h-2 flex-1 rounded-full bg-slate-100" />
                </div>

                {/* 仪表盘内容模拟 */}
                <div className="space-y-4">
                  {/* 数据卡片行 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4">
                      <div className="text-2xl font-bold text-blue-600">2.5K</div>
                      <div className="text-xs text-blue-500">新增客户</div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4">
                      <div className="text-2xl font-bold text-purple-600">89%</div>
                      <div className="text-xs text-purple-500">转化率</div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 p-4">
                      <div className="text-2xl font-bold text-cyan-600">+32%</div>
                      <div className="text-xs text-cyan-500">环比增长</div>
                    </div>
                  </div>

                  {/* 图表模拟 */}
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">销售趋势</span>
                      <span className="text-xs text-slate-400">本月</span>
                    </div>
                    <div className="flex items-end gap-2 h-24">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: shouldReduceMotion ? h : `${h}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + i * 0.05 }}
                          className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-purple-500"
                        />
                      ))}
                    </div>
                  </div>

                  {/* 客户列表模拟 */}
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="mb-3 text-sm font-medium text-slate-700">最近客户</div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200" />
                          <div className="flex-1">
                            <div className="h-3 w-24 rounded bg-slate-100" />
                            <div className="mt-1 h-2 w-16 rounded bg-slate-50" />
                          </div>
                          <div className="h-6 w-16 rounded-full bg-green-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 浮动通知 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: 0.8 }}
                className="absolute -right-4 -bottom-4 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">新订单</div>
                    <div className="text-xs text-slate-500">刚刚</div>
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
