/**
 * 未保存更改提示 Hook
 * 在用户尝试离开页面时提示未保存的更改
 */

import { useEffect, useCallback } from "react";

interface UseUnsavedChangesOptions {
  isDirty: boolean;
  message?: string;
}

export function useUnsavedChanges({
  isDirty,
  message = "您有未保存的更改，确定要离开吗？",
}: UseUnsavedChangesOptions) {
  // 处理页面刷新/关闭
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, message]);

  // 确认离开的函数
  const confirmExit = useCallback(() => {
    if (isDirty) {
      return window.confirm(message);
    }
    return true;
  }, [isDirty, message]);

  return { confirmExit };
}
