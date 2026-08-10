import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { PageHeader } from "@/components/PageHeader";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "联系我们",
  description: `联系 ${SITE.name},提交您的需求,我们将尽快与您联系。`,
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <div className="hero-mesh relative overflow-hidden border-b border-ink-100">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative py-16">
          <PageHeader title="联系我们" mb="mb-0" />
        </div>
      </div>

      <section className="container py-16">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-gray-900">留下您的需求</h2>
            <p className="text-gray-600">
              填写下方表单,我们的团队会在第一时间与您取得联系
            </p>
          </div>

          <ContactForm />
        </div>
      </section>
    </>
  );
}
