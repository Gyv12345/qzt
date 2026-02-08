"use client";

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Building2, Users, Heart, Headphones } from "lucide-react";

const stats = [
  {
    id: 1,
    name: "服务企业",
    value: 10000,
    suffix: "+",
    icon: Building2,
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
  },
  {
    id: 2,
    name: "活跃用户",
    value: 50000,
    suffix: "+",
    icon: Users,
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50",
  },
  {
    id: 3,
    name: "客户满意度",
    value: 99,
    suffix: "%",
    icon: Heart,
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
  },
  {
    id: 4,
    name: "技术支持",
    value: 24,
    suffix: "/7",
    icon: Headphones,
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-50",
  },
];

// 数字动画组件
function AnimatedValue({ end, suffix }: { end: number; suffix: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(startValue + (end - startValue) * easeOutQuart));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [end]);

  return (
    <span>
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated]);

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
    <section className="relative overflow-hidden border-y border-slate-200/50 bg-gradient-to-b from-slate-50 to-white py-20">
      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-100/30 via-purple-100/30 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={hasAnimated || shouldReduceMotion ? "visible" : "hidden"}
          variants={containerVariants}
          className="grid grid-cols-2 gap-6 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.id}
              variants={itemVariants}
              className="group relative"
            >
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10">
                {/* 背景渐变 */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 transition-opacity duration-300 group-hover:opacity-5`} />

                {/* 图标 */}
                <div className={`relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${stat.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                  <stat.icon className={`h-7 w-7 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} />
                </div>

                {/* 数值 */}
                <div className="relative">
                  <div className="text-3xl font-heading font-bold text-slate-900 md:text-4xl lg:text-5xl">
                    {hasAnimated || shouldReduceMotion ? (
                      <AnimatedValue end={stat.value} suffix={stat.suffix} />
                    ) : (
                      <>{stat.value.toLocaleString()}{stat.suffix}</>
                    )}
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-600 md:text-base">
                    {stat.name}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* 信任徽章 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={hasAnimated || shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.6, delay: 0.4 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-8 text-slate-400"
        >
          <div className="flex items-center gap-2 text-sm">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>SOC2 认证</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>ISO 27001</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>Gartner 推荐</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
