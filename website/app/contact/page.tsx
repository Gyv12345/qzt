import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ContactPageContent } from "./contact-page-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "联系我们 - 企智通",
  description: "联系企智通获取专业的客户关系管理解决方案咨询，我们的团队随时为您提供帮助。",
};

export const revalidate = 3600; // ISR 缓存 1 小时

export default function ContactPage() {
  return (
    <>
      <Header />
      <main>
        <ContactPageContent />
      </main>
      <Footer />
    </>
  );
}
