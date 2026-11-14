"use client";

import Link from "next/link";
import { useState } from "react";
import type { Dict } from "@/i18n";

export interface PreselectedProduct {
  id: number;
  name: string;
}

/**
 * 询盘表单(client): 提交走同源相对路径 /prod-api/storefront/public/inquiries,
 * 生产由 nginx 反代到后端 9000(去 /prod-api 前缀); 本地 dev 由 next.config
 * rewrites 转发(静态导出后无服务端代理, 见 next.config 注释)。
 * 后端每 IP 每分钟 3 次限频: HTTP 429 或信封 code!=0 → 友好错误文案。
 */
export function InquiryForm({
  locale,
  dict,
  preselected,
  initialMessage,
  singleProductId,
}: {
  locale: string;
  dict: Dict;
  preselected: PreselectedProduct[];
  initialMessage: string;
  singleProductId?: number;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [leadNo, setLeadNo] = useState("");

  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !message.trim()) {
      setError(dict.inquiry.required);
      return;
    }
    if (!emailOk(email.trim())) {
      setError(dict.inquiry.invalidEmail);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/prod-api/storefront/public/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
          country: country || undefined,
          message: message.trim(),
          storefront_product_id: singleProductId,
          locale,
        }),
      });
      if (res.status === 429) {
        setError(dict.inquiry.failRateLimit);
        return;
      }
      if (!res.ok) {
        setError(dict.inquiry.failGeneric);
        return;
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("application/json")) {
        // 网关异常时可能是 502 HTML, 避免抛 "Unexpected token '<'" 这类不可读错误
        setError(dict.inquiry.failGeneric);
        return;
      }
      const body = (await res.json()) as {
        code: number;
        msg?: string;
        data?: { lead_no?: string };
      };
      if (body.code !== 0 || !body.data?.lead_no) {
        setError(dict.inquiry.failGeneric);
        return;
      }
      setLeadNo(body.data.lead_no);
    } catch {
      setError(dict.inquiry.failGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  if (leadNo) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center shadow-card">
        <p className="font-display text-xl font-bold text-strong">{dict.inquiry.successTitle}</p>
        <p className="mt-3 text-sm text-normal">
          {dict.inquiry.successLead}{" "}
          <span className="font-mono font-bold text-brand-700">{leadNo}</span>
        </p>
        <p className="mt-2 text-sm text-muted">{dict.inquiry.successReply}</p>
        <Link href={`/${locale}`} className="btn-outline mt-6">
          {dict.inquiry.successBack}
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {preselected.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-strong">{dict.inquiry.products}</p>
          <div className="flex flex-wrap gap-2">
            {preselected.map((p) => (
              <span
                key={p.id}
                className="rounded-md border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-faint">{dict.inquiry.productsNone}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-strong">{dict.inquiry.name} *</span>
          <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-strong">{dict.inquiry.email} *</span>
          <input className="input-base" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-strong">{dict.inquiry.company}</span>
          <input className="input-base" value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-strong">{dict.inquiry.country}</span>
          <select className="input-base" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">—</option>
            {Object.entries(dict.countries).map(([code, label]) => (
              <option key={code} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-strong">{dict.inquiry.message} *</span>
        <textarea
          className="input-base min-h-32"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </label>

      {error && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary min-w-40">
        {submitting ? dict.inquiry.submitting : dict.inquiry.submit}
      </button>
    </form>
  );
}
