import type { Metadata } from "next";
import { getPartners } from "@/lib/api";
import { PartnerCard } from "@/components/Cards";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "合作伙伴",
  description: "与我们合作的客户与伙伴, 数据来源于 CRM 系统, 实时更新。",
  alternates: {
    canonical: "/partners",
    types: { "text/markdown": "/md/partners" },
  },
};

export default async function PartnersPage() {
  const { list } = await getPartners({ page_size: 48 }).catch(() => ({ list: [], total: 0 }));

  return (
    <>
      <div className="hero-mesh relative overflow-hidden border-b border-line">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative py-16">
          <PageHeader title="合作伙伴" subtitle="我们服务的客户, 数据实时同步" />
        </div>
      </div>
      <section className="container py-16">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
          {list.length > 0 ? (
            list.map((p) => <PartnerCard key={p.id} partner={p} />)
          ) : (
            <EmptyState text="暂无合作方数据" />
          )}
        </div>
      </section>
    </>
  );
}
