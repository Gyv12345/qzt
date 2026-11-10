/**
 * React Bits — FadeContent 内容显现(进入视口淡入)
 * 来源: https://reactbits.dev/components/fade-content (github.com/DavidHDev/react-bits, MIT)
 * 本仓适配: TS 化; 去掉 'use client'(Vite 非 Next); css prop 类型改为 React.CSSProperties(上游为 any)。
 * 与 qzt-go-mobile/qzt-go-cms 同款。
 * 依赖: 无(纯 IntersectionObserver + CSS transition, 比 motion 版更轻)。
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface FadeContentProps {
  children: ReactNode;
  /** 初始(未显现)透明度 */
  opacity?: number;
  /** 显现耗时(ms), 默认 500 */
  duration?: number;
  /** 显现延迟(ms), 默认 0 */
  delay?: number;
  /** 显现时是否附带轻微模糊消除效果 */
  blur?: boolean;
  /** IntersectionObserver threshold, 默认 0.1 */
  threshold?: number;
  /** IntersectionObserver rootMargin, 默认 '0px' */
  rootMargin?: string;
  /** 附加到容器上的额外样式 */
  css?: CSSProperties;
}

export default function FadeContent({
  children,
  opacity = 0,
  duration = 500,
  delay = 0,
  blur = false,
  threshold = 0.1,
  rootMargin = '0px',
  css = {},
}: FadeContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : opacity,
        filter: inView ? 'none' : (blur ? 'blur(10px)' : 'none'),
        transition: `opacity ${duration}ms ease, filter ${duration}ms ease`,
        // transitionDelay 单值作用于全部 transition 属性, 保证 opacity/filter 同步延迟
        transitionDelay: `${delay}ms`,
        ...css,
      }}
    >
      {children}
    </div>
  );
}
