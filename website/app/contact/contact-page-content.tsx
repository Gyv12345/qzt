"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useState, FormEvent } from "react";
import Link from "next/link";

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

export function ContactPageContent() {
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
  const [submitError, setSubmitError] = useState("");

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

    // 邮箱验证（选填，但填写时需要验证格式）
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
    setSubmitError("");

    try {
      // 提交联系表单
      const response = await fetch(`${API_URL}/public/contact/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "提交失败，请稍后重试");
      }

      const result = await response.json();

      setSubmitSuccess(true);

      // 3 秒后重置表单或跳转
      setTimeout(() => {
        setSubmitSuccess(false);
        setFormData({
          name: "",
          phone: "",
          email: "",
          company: "",
          message: "",
        });
      }, 3000);
    } catch (error) {
      setSubmitError(
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
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/50 py-24 lg:py-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute right-1/4 top-1/4 h-96 w-96 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-transparent blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              联系
              <span className="mt-2 block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                我们
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              无论您有任何问题或需求，我们的团队都随时准备为您提供帮助。
              填写表单或通过以下方式联系我们。
            </p>
          </motion.div>
        </div>
      </section>

      {/* 联系方式 + 表单 */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* 左侧：联系方式 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-2"
            >
              <h2 className="text-2xl font-bold text-slate-900">
                联系方式
              </h2>
              <p className="mt-2 text-slate-600">
                选择最适合您的联系方式，我们会在 24 小时内回复。
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/20">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">电话</h3>
                    <p className="mt-1 text-slate-600">400-123-4567</p>
                    <p className="text-sm text-slate-500">
                      工作日 9:00 - 18:00
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/20">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">邮箱</h3>
                    <p className="mt-1 text-slate-600">contact@qzt.com</p>
                    <p className="text-sm text-slate-500">
                      我们会在 24 小时内回复
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/20">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">地址</h3>
                    <p className="mt-1 text-slate-600">
                      深圳市南山区科技园
                      <br />
                      腾讯大厦 A 座 18 层
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/20">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">工作时间</h3>
                    <p className="mt-1 text-slate-600">
                      周一至周五：9:00 - 18:00
                    </p>
                    <p className="text-sm text-slate-500">
                      周末及节假日休息
                    </p>
                  </div>
                </div>
              </div>

              {/* 快速链接 */}
              <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="font-semibold text-slate-900">快速链接</h3>
                <div className="mt-4 space-y-3">
                  <Link
                    href="/articles"
                    className="flex items-center justify-between text-sm text-slate-600 transition-colors hover:text-blue-600"
                  >
                    了解产品详情
                    <span>→</span>
                  </Link>
                  <Link
                    href="/cases"
                    className="flex items-center justify-between text-sm text-slate-600 transition-colors hover:text-blue-600"
                  >
                    查看客户案例
                    <span>→</span>
                  </Link>
                  <Link
                    href="/profiles"
                    className="flex items-center justify-between text-sm text-slate-600 transition-colors hover:text-blue-600"
                  >
                    了解我们的团队
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* 右侧：联系表单 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-3"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
                <h2 className="text-2xl font-bold text-slate-900">
                  在线咨询
                </h2>
                <p className="mt-2 text-slate-600">
                  填写以下表单，我们的顾问会在 24 小时内与您联系。
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                  {/* 姓名 */}
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
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
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* 电话 */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      联系电话 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
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
                      <p className="mt-1 text-sm text-red-500">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  {/* 邮箱 */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      邮箱 <span className="text-slate-400">（选填）</span>
                    </label>
                    <input
                      type="email"
                      id="email"
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
                      <p className="mt-1 text-sm text-red-500">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* 公司名称 */}
                  <div>
                    <label
                      htmlFor="company"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      公司名称 <span className="text-slate-400">（选填）</span>
                    </label>
                    <input
                      type="text"
                      id="company"
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
                      htmlFor="message"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      留言内容 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={5}
                      placeholder="请简要描述您的需求或问题，我们会尽快与您联系..."
                      className={`w-full rounded-lg border px-4 py-3 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        errors.message
                          ? "border-red-300 bg-red-50"
                          : "border-slate-300 bg-white"
                      }`}
                    />
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {/* 错误提示 */}
                  {submitError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-600">{submitError}</p>
                    </div>
                  )}

                  {/* 成功提示 */}
                  {submitSuccess && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <p className="text-sm text-green-600">
                          提交成功！我们会尽快与您联系。
                        </p>
                      </div>
                    </div>
                  )}

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
                    提交即表示您同意我们的
                    <Link href="#" className="text-blue-600 hover:underline">
                      隐私政策
                    </Link>
                    ，我们将保护您的个人信息安全。
                  </p>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 地图区域（可选） */}
      <section className="relative overflow-hidden bg-slate-50 py-24">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="text-3xl font-heading font-bold tracking-tight text-slate-900 sm:text-4xl">
              欢迎莅临参观
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              如果您想深入了解我们的产品，欢迎到公司参观交流。
            </p>
          </motion.div>

          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
            <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="mx-auto h-16 w-16 text-slate-400" />
                <p className="mt-4 text-slate-600">
                  地图加载中...
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  深圳市南山区科技园腾讯大厦 A 座 18 层
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
