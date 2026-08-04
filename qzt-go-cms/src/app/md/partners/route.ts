import { getPartners } from "@/lib/api";
import { mdResponse, partnerListToMd } from "@/lib/markdown";

/** /md/partners — 合作伙伴 Markdown。 */
export const revalidate = 300;

export async function GET() {
  const { list } = await getPartners({ page_size: 200 }).catch(() => ({ list: [], total: 0 }));
  return mdResponse(partnerListToMd(list));
}
