import type { Metadata } from "next";
import { getTeam } from "@/lib/api";
import { TeamCard } from "@/components/Cards";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "团队",
  description: "我们的团队成员, 专业、可靠, 为您提供优质服务。",
  alternates: {
    canonical: "/team",
    types: { "text/markdown": "/md/team" },
  },
};

export default async function TeamPage() {
  const { list } = await getTeam({ page_size: 48 }).catch(() => ({ list: [], total: 0 }));

  return (
    <>
      <div className="hero-mesh relative overflow-hidden border-b border-white/[0.06]">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative py-16">
          <PageHeader title="我们的团队" subtitle="专业的人才, 为您服务" />
        </div>
      </div>
      <section className="container py-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4">
          {list.length > 0 ? (
            list.map((m) => <TeamCard key={m.id} member={m} />)
          ) : (
            <EmptyState text="暂无团队成员" />
          )}
        </div>
      </section>
    </>
  );
}
