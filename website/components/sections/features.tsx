"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Zap,
  Shield,
  BarChart,
  Users,
  MessageSquare,
  Globe,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Zap,
    title: "快速部署",
    description: "5分钟即可完成部署，无需复杂配置，开箱即用",
  },
  {
    icon: Shield,
    title: "安全可靠",
    description: "企业级安全保障，数据加密存储，多维度权限控制",
  },
  {
    icon: BarChart,
    title: "数据分析",
    description: "强大的数据分析和报表功能，助力科学决策",
  },
  {
    icon: Users,
    title: "客户管理",
    description: "360度客户画像，全生命周期管理，提升客户满意度",
  },
  {
    icon: MessageSquare,
    title: "智能沟通",
    description: "多渠道沟通整合，自动化跟进，不错过任何商机",
  },
  {
    icon: Globe,
    title: "全球可用",
    description: "支持多语言、多币种，轻松拓展海外业务",
  },
];

export function FeaturesSection() {
  const shouldReduceMotion = useReducedMotion();

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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.5 },
    },
  };

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="text-center"
        >
          <motion.h2
            variants={itemVariants}
            className="text-3xl font-heading font-bold md:text-4xl"
          >
            强大的功能，简单的操作
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mt-4 text-lg text-muted-foreground"
          >
            我们为您提供全方位的企业管理解决方案
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <Card className="h-full border-transparent shadow-none transition-all hover:shadow-lg hover:shadow-blue-500/10">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
