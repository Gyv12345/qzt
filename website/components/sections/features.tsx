"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Zap,
  Shield,
  BarChart,
  Users,
  MessageSquare,
  Globe,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CmsPage } from "@/lib/api";

const defaultFeatures = [
  {
    icon: Zap,
    title: "快速部署",
    description: "5分钟即可完成部署，无需复杂配置，开箱即用",
    gradient: "from-yellow-400 to-orange-500",
    bgGradient: "from-yellow-50 to-orange-50",
  },
  {
    icon: Shield,
    title: "安全可靠",
    description: "企业级安全保障，数据加密存储，多维度权限控制",
    gradient: "from-green-400 to-emerald-500",
    bgGradient: "from-green-50 to-emerald-50",
  },
  {
    icon: BarChart,
    title: "数据分析",
    description: "强大的数据分析和报表功能，助力科学决策",
    gradient: "from-blue-400 to-cyan-500",
    bgGradient: "from-blue-50 to-cyan-50",
  },
  {
    icon: Users,
    title: "客户管理",
    description: "360度客户画像，全生命周期管理，提升客户满意度",
    gradient: "from-purple-400 to-pink-500",
    bgGradient: "from-purple-50 to-pink-50",
  },
  {
    icon: MessageSquare,
    title: "智能沟通",
    description: "多渠道沟通整合，自动化跟进，不错过任何商机",
    gradient: "from-indigo-400 to-blue-500",
    bgGradient: "from-indigo-50 to-blue-50",
  },
  {
    icon: Globe,
    title: "全球可用",
    description: "支持多语言、多币种，轻松拓展海外业务",
    gradient: "from-teal-400 to-cyan-500",
    bgGradient: "from-teal-50 to-cyan-50",
  },
];

interface FeaturesSectionProps {
  pageData?: CmsPage | null;
}

// 从页面数据解析功能内容
function parsePageData(pageData: CmsPage | null | undefined) {
  if (!pageData?.elements) return null;

  const featureElements = pageData.elements
    .filter((el) => el.sectionType === "FEATURES" && el.elementType === "card" && el.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (featureElements.length === 0) return null;

  return featureElements.map((el) => {
    try {
      const content = el.content ? JSON.parse(el.content) : {};
      return {
        icon: Zap, // 简化处理
        title: content.title || "功能特点",
        description: content.description || "",
        gradient: content.gradient || "from-blue-400 to-cyan-500",
        bgGradient: content.bgGradient || "from-blue-50 to-cyan-50",
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export function FeaturesSection({ pageData }: FeaturesSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  // 优先使用页面数据，回退到默认值
  const features = parsePageData(pageData) || defaultFeatures;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.5 },
    },
  };

  return (
    <section className="relative overflow-hidden py-24">
      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-1/4 h-96 w-96 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-100/50 via-purple-100/50 to-transparent blur-3xl" />
        <div className="absolute left-0 bottom-1/4 h-96 w-96 translate-y-1/2 rounded-full bg-gradient-to-tr from-cyan-100/50 via-blue-100/50 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="text-center"
        >
          <motion.div
            variants={itemVariants}
            className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-blue-200/50"
          >
            ✨ 核心功能
          </motion.div>
          <motion.h2
            variants={itemVariants}
            className="text-3xl font-heading font-bold tracking-tight text-slate-900 md:text-4xl lg:text-5xl"
          >
            强大的功能，
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              简单的操作
            </span>
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mt-4 text-lg text-slate-600 md:text-xl"
          >
            我们为您提供全方位的企业管理解决方案
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.filter((f): f is NonNullable<typeof f> => Boolean(f)).map((feature, index) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <Card className="group relative h-full border-slate-200/60 bg-white/80 p-1 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-xl hover:shadow-blue-500/10">
                {/* 渐变边框效果 */}
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

                <CardContent className="relative h-full rounded-lg bg-white p-6">
                  <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg shadow-blue-500/20 transition-transform duration-300 group-hover:scale-110`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="mb-3 text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed text-slate-600">
                    {feature.description}
                  </CardDescription>

                  {/* 箭头指示器 */}
                  <div className="mt-4 flex items-center text-sm font-medium text-blue-600 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                    了解更多
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
