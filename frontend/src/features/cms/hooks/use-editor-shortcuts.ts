/**
 * 编辑器快捷键 Hook
 * 支持 Cmd/Ctrl + S 保存、Cmd/Ctrl + P 预览、Esc 返回等
 */

import { useEffect } from "react";

interface UseEditorShortcutsOptions {
  onSave: () => void;
  onPublish?: () => void;
  onPreview: () => void;
  onBack: () => void;
}

export function useEditorShortcuts({
  onSave,
  onPublish,
  onPreview,
  onBack,
}: UseEditorShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModKey = e.metaKey || e.ctrlKey;
      const isShiftKey = e.shiftKey;

      // Cmd/Ctrl + S: 保存
      if (isModKey && !isShiftKey && e.key === "s") {
        e.preventDefault();
        onSave();
      }

      // Cmd/Ctrl + Shift + S: 保存并发布
      if (isModKey && isShiftKey && e.key === "s") {
        e.preventDefault();
        onPublish?.();
      }

      // Cmd/Ctrl + P: 预览
      if (isModKey && !isShiftKey && e.key === "p") {
        e.preventDefault();
        onPreview();
      }

      // Esc: 返回
      if (e.key === "Escape") {
        e.preventDefault();
        onBack();
      }

      // Cmd/Ctrl + Enter: 发布
      if (isModKey && e.key === "Enter") {
        e.preventDefault();
        onPublish?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onSave, onPublish, onPreview, onBack]);
}
