"use client";

import { useState, FormEvent, useEffect } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7890";

interface FormData {
  name: string;
  phone: string;
  email: string;
  company: string;
  message: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
}

interface ContactFormProps {
  source?: string; // 来源标识，如 "首页"、"关于我们"等
  onSuccess?: () => void;
}

export function ContactForm({ source = "网站表单", onSuccess }: ContactFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    company: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 重置成功状态
  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitSuccess]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // 姓名验证
    if (!formData.name.trim()) {
      newErrors.name = "请输入您的姓名";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "姓名至少需要 2 个字符";
    }

    // 电话验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = "请输入您的联系电话";
    } else if (!phoneRegex.test(formData.phone.trim())) {
      newErrors.phone = "请输入有效的手机号码";
    }

    // 邮箱验证（选填）
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = "请输入有效的邮箱地址";
      }
    }

    // 留言验证
    if (!formData.message.trim()) {
      newErrors.message = "请输入留言内容";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "留言内容至少需要 10 个字符";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/public/contact/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          message: `[${source}] ${formData.message}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "提交失败，请稍后重试");
      }

      const result = await response.json();

      setSubmitSuccess(true);
      setFormData({
        name: "",
        phone: "",
        email: "",
        company: "",
        message: "",
      });

      // 调用成功回调
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("提交失败:", error);
      // 简单的错误提示
      alert(
        error instanceof Error ? error.message : "提交失败，请稍后重试"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // 清除该字段的错误
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 成功提示 */}
      <AnimatePresence>
        {submitSuccess && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-600">
                  提交成功！我们会尽快与您联系。
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 姓名 */}
      <div>
        <label
          htmlFor="cf-name"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          姓名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="cf-name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="请输入您的姓名"
          className={`w-full rounded-lg border px-4 py-3 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            errors.name
              ? "border-red-300 bg-red-50"
              : "border-slate-300 bg-white"
          }`}
        />
        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* 电话 */}
      <div>
        <label
          htmlFor="cf-phone"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          联系电话 <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="cf-phone"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          placeholder="请输入您的手机号码"
          className={`w-full rounded-lg border px-4 py-3 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            errors.phone
              ? "border-red-300 bg-red-50"
              : "border-slate-300 bg-white"
          }`}
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
        )}
      </div>

      {/* 邮箱 */}
      <div>
        <label
          htmlFor="cf-email"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          邮箱 <span className="text-slate-400">（选填）</span>
        </label>
        <input
          type="email"
          id="cf-email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="请输入您的邮箱地址"
          className={`w-full rounded-lg border px-4 py-3 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            errors.email
              ? "border-red-300 bg-red-50"
              : "border-slate-300 bg-white"
          }`}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-500">{errors.email}</p>
        )}
      </div>

      {/* 公司名称 */}
      <div>
        <label
          htmlFor="cf-company"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          公司名称 <span className="text-slate-400">（选填）</span>
        </label>
        <input
          type="text"
          id="cf-company"
          name="company"
          value={formData.company}
          onChange={handleInputChange}
          placeholder="请输入您的公司名称"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* 留言 */}
      <div>
        <label
          htmlFor="cf-message"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          留言内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="cf-message"
          name="message"
          value={formData.message}
          onChange={handleInputChange}
          rows={4}
          placeholder="请简要描述您的需求或问题，我们会尽快与您联系..."
          className={`w-full rounded-lg border px-4 py-3 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            errors.message
              ? "border-red-300 bg-red-50"
              : "border-slate-300 bg-white"
          }`}
        />
        {errors.message && (
          <p className="mt-1 text-sm text-red-500">{errors.message}</p>
        )}
      </div>

      {/* 提交按钮 */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        size="lg"
      >
        {isSubmitting ? (
          <>提交中...</>
        ) : (
          <>
            提交咨询
            <Send className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-slate-500">
        提交即表示您同意我们的隐私政策，我们将保护您的个人信息安全。
      </p>
    </form>
  );
}
