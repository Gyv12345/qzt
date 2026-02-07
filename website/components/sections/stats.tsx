"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const stats = [
  { id: 1, name: "服务企业", value: "10,000+" },
  { id: 2, name: "活跃用户", value: "50,000+" },
  { id: 3, name: "客户满意度", value: "99%" },
  { id: 4, name: "7x24 支持", value: "全年无休" },
];

export function StatsSection() {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated]);

  return (
    <section className="border-y bg-muted/30 py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={
            hasAnimated || shouldReduceMotion
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 20 }
          }
          transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
          className="grid grid-cols-2 gap-8 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <div key={stat.id} className="text-center">
              <div className="text-4xl font-heading font-bold text-primary md:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 text-sm font-medium text-muted-foreground">
                {stat.name}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
