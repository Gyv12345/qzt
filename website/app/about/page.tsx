import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AboutPageContent } from "./about-page-content";
import { getActiveUsers, type PublicUser } from "@/lib/api";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于我们 - 企智通",
  description: "了解企智通的发展历程、企业文化与核心团队，我们致力于为企业提供专业的客户关系管理解决方案。",
};

export const revalidate = 3600; // ISR 缓存 1 小时

async function AboutPage() {
  // 获取团队人员数据（从用户系统获取启用状态的用户）
  const usersResult = await getActiveUsers({ pageSize: 10 });
  const users = usersResult.data;

  return (
    <>
      <Header />
      <main>
        <AboutPageContent users={users} />
      </main>
      <Footer />
    </>
  );
}

export default AboutPage;
