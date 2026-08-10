"use client";

import { useState } from "react";
import { submitContact, type ContactPayload } from "../lib/api";

export default function ContactForm() {
  const [form, setForm] = useState<ContactPayload>({
    name: "",
    phone: "",
    email: "",
    company: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      await submitContact(form);
      setStatus("success");
      setForm({ name: "", phone: "", email: "", company: "", message: "" });
      setTimeout(() => setStatus("idle"), 5000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "提交失败,请稍后重试");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-12 text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h3 className="mb-2 text-xl font-bold text-gray-900">提交成功!</h3>
        <p className="text-gray-600">
          感谢您的留言,我们的团队会尽快与您联系。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            placeholder="您的姓名"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            电话 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            required
            value={form.phone}
            onChange={handleChange}
            placeholder="您的手机号"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">邮箱</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="您的邮箱(选填)"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">公司名称</label>
          <input
            type="text"
            name="company"
            value={form.company}
            onChange={handleChange}
            placeholder="您的公司(选填)"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          留言内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          name="message"
          required
          rows={5}
          value={form.message}
          onChange={handleChange}
          placeholder="请描述您的需求或问题..."
          className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {status === "error" && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "提交中..." : "提交留言"}
      </button>

      <p className="text-center text-xs text-gray-400">
        提交后我们将尽快与您联系,您的信息将被严格保密
      </p>
    </form>
  );
}
