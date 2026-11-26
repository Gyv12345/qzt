"use client";

import { useState } from "react";
import Link from "next/link";
import { submitContact, type ContactPayload } from "../lib/api";
import { flush, track } from "../lib/track";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactForm({ privacyLive = false }: { privacyLive?: boolean }) {
  const [form, setForm] = useState<ContactPayload>({
    name: "",
    phone: "",
    email: "",
    company: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  // Honeypot 反垃圾: 视觉隐藏的诱饵字段, 正常用户永远为空。
  const [website, setWebsite] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");

    // Honeypot 被填充 → 几乎必是自动填表的垃圾机器人:
    // 假装提交成功, 不发请求。
    if (website.trim() !== "") {
      setStatus("success");
      setForm({ name: "", phone: "", email: "", company: "", message: "" });
      setWebsite("");
      setTimeout(() => setStatus("idle"), 5000);
      return;
    }

    try {
      await submitContact(form);
      // 转化事件:留言提交成功,立即随队列上报
      track("contact_submit");
      flush();
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
      <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-12 text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h3 className="mb-2 text-xl font-bold text-strong">提交成功!</h3>
        <p className="text-muted">
          感谢您的留言,我们的团队会尽快与您联系。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name" className="mb-1.5 block">
            姓名 <span className="text-danger">*</span>
          </Label>
          <Input id="contact-name" type="text" name="name" required maxLength={50} value={form.name} onChange={handleChange} placeholder="您的姓名" />
        </div>
        <div>
          <Label htmlFor="contact-phone" className="mb-1.5 block">
            电话 <span className="text-danger">*</span>
          </Label>
          <Input id="contact-phone" type="tel" name="phone" required maxLength={30} value={form.phone} onChange={handleChange} placeholder="您的手机号" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-email" className="mb-1.5 block">邮箱</Label>
          <Input id="contact-email" type="email" name="email" maxLength={100} value={form.email} onChange={handleChange} placeholder="您的邮箱(选填)" />
        </div>
        <div>
          <Label htmlFor="contact-company" className="mb-1.5 block">公司名称</Label>
          <Input id="contact-company" type="text" name="company" maxLength={100} value={form.company} onChange={handleChange} placeholder="您的公司(选填)" />
        </div>
      </div>

      <div>
        <Label htmlFor="contact-message" className="mb-1.5 block">
          留言内容 <span className="text-danger">*</span>
        </Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          maxLength={1000}
          value={form.message}
          onChange={handleChange}
          placeholder="请描述您的需求或问题..."
        />
      </div>

      {/* Honeypot 反垃圾: CSS 视觉隐藏, 正常用户不会填写也不会聚焦 */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      {status === "error" && (
        <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <Button type="submit" disabled={status === "loading"} className="w-full py-3.5">
        {status === "loading" ? "提交中..." : "提交留言"}
      </Button>

      <p className="text-center text-xs text-faint">
        提交即表示同意我们按
        {privacyLive && (
          <Link href="/p/privacy" className="underline transition-colors hover:text-muted">
            《隐私政策》
          </Link>
        )}
        处理您的姓名、电话、邮箱等信息,仅用于与您联系
      </p>
    </form>
  );
}
