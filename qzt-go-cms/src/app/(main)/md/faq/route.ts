import { faqListToMd, mdResponse, parseFaq } from "@/lib/markdown";
import { getSiteConfig } from "@/lib/api";

/** /md/faq — 常见问题 Markdown (GEO 问答结构)。 */
export const revalidate = 300;

export async function GET() {
  const cfg = await getSiteConfig().catch(() => null);
  return mdResponse(faqListToMd(parseFaq(cfg?.faq_json)));
}
