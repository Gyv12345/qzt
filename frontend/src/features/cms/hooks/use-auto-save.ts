/**
 * 自动保存 Hook
 * 防抖延迟后自动保存内容
 */

import { useEffect, useRef } from "react";

interface UseAutoSaveOptions {
  autoSave: () => void | Promise<void>;
  delay?: number;
}

export function useAutoSave({ autoSave, delay = 3000 }: UseAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // 清理定时器
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // 设置新的定时器
    timeoutRef.current = setTimeout(async () => {
      try {
        await autoSave();
        lastSaveTimeRef.current = Date.now();
      } catch (error) {
        console.error("自动保存失败:", error);
      }
    }, delay);

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [autoSave, delay]);
}
