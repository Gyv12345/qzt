import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { PageHeader } from "@/components/PageHeader";
import ContactForm from "@/components/ContactForm";
import { getPage } from "@/lib/api";

export const metadata: Metadata = {
  title: "联系我们",
  description: `联系 ${SITE.name},提交您的需求,我们将尽快与您联系。`,
  alternates: {
    canonical: "/contact",
  },
};

export default async function ContactPage() {
  // 隐私政策构建时探测(R63-D1):页面未发布(草稿/误下线)时表单告知区不渲染死链
  let privacyLive = false;
  try {
    await getPage("privacy");
    privacyLive = true;
  } catch {
    // 草稿态/不存在 → 不渲染链接
  }

  return (
    <>
      <div className="hero-mesh relative overflow-hidden border-b border-line">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative py-16">
          <PageHeader title="联系我们" mb="mb-0" />
        </div>
      </div>

      <section className="container py-16">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-strong">留下您的需求</h2>
            <p className="text-muted">
              填写下方表单,我们的团队会在第一时间与您取得联系
            </p>
          </div>

          <ContactForm />
        </div>
      </section>
    </>
  );
}
