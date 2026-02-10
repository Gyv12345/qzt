"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ContactForm } from "./contact-form";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";

interface ContactDrawerProps {
  open: boolean;
  onClose: () => void;
  source?: string;
}

export function ContactDrawer({ open, onClose, source }: ContactDrawerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 处理 ESC 键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // 阻止背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!isMounted) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 抽屉 */}
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative h-full w-full max-w-md bg-white shadow-2xl"
            >
              {/* 头部 */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-xl font-bold text-slate-900">联系我们</h2>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="关闭"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 内容 */}
              <div className="px-6 py-6 overflow-y-auto max-h-[calc(100vh-80px)]">
                <p className="mb-6 text-sm text-slate-600">
                  填写以下表单，我们的顾问会在 24 小时内与您联系。
                </p>
                <ContactForm source={source} onSuccess={onClose} />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// 用于在页面中使用联系表单的 Hook
export function useContactDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState("网站表单");

  const open = (sourceOverride?: string) => {
    if (sourceOverride) {
      setSource(sourceOverride);
    }
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  return {
    isOpen,
    open,
    close,
    source,
    ContactDrawerComponent: () => (
      <ContactDrawer open={isOpen} onClose={close} source={source} />
    ),
  };
}
