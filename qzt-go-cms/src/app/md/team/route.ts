import { getTeam } from "@/lib/api";
import { mdResponse, teamListToMd } from "@/lib/markdown";

/** /md/team — 团队 Markdown。 */
export const revalidate = 300;

export async function GET() {
  const { list } = await getTeam({ page_size: 200 }).catch(() => ({ list: [], total: 0 }));
  return mdResponse(teamListToMd(list));
}
