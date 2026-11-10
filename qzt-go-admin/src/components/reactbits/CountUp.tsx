/**
 * React Bits — CountUp 数字滚动
 * 来源: https://reactbits.dev/text-animations/count-up (github.com/DavidHDev/react-bits, MIT)
 * 本仓适配: TS 化; 去掉 'use client'(Vite 非 Next); 新增 decimals 小数位 prop(上游仅整数输出,
 * admin KPI 金额需要 precision=2, 这里支持自定义小数位)。与 qzt-go-mobile/qzt-go-cms 同款。
 * 工作方式: 直接写 ref.textContent 渲染(不经过 React 状态), 动画过程零 React 重渲染;
 * 进入视口(useInView once)后开始; `to` 变化时从当前值平滑滚动到新值。
 * 依赖: motion。
 */
import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring, useMotionValueEvent } from 'motion/react';

interface CountUpProps {
  /** 目标值 */
  to: number;
  /** 起始值(默认 0) */
  from?: number;
  /** 'up'=从 from 滚到 to; 'down'=从 to 滚到 from */
  direction?: 'up' | 'down';
  /** 入视口后延迟开始(秒) */
  delay?: number;
  /** 一次滚动时长(秒) */
  duration?: number;
  className?: string;
  /** false=不自动播放 */
  startWhen?: boolean;
  /** 千分位分隔符(空串=不加) */
  separator?: string;
  /** 小数位数(本仓新增; 金额类传 2) */
  decimals?: number;
}

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = ',',
  decimals = 0,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === 'down' ? to : from);
  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);
  const springValue = useSpring(motionValue, { damping, stiffness });
  const isInView = useInView(ref, { once: true, margin: '0px' });

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatNumber(direction === 'down' ? to : from, decimals, separator);
    }
  }, []);

  useEffect(() => {
    if (!isInView || !startWhen) return;
    const timeoutId = setTimeout(() => {
      motionValue.set(direction === 'down' ? from : to);
    }, delay * 1000);
    return () => clearTimeout(timeoutId);
  }, [isInView, startWhen, direction, from, to, delay, motionValue]);

  useMotionValueEvent(springValue, 'change', (latest) => {
    if (ref.current && startWhen && isInView) {
      ref.current.textContent = formatNumber(latest, decimals, separator);
    }
  });

  return <span className={className} ref={ref} />;
}

function formatNumber(n: number, decimals: number, separator: string): string {
  const [intPart, decPart] = n.toFixed(decimals).split('.');
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return decPart !== undefined ? `${withSep}.${decPart}` : withSep;
}
