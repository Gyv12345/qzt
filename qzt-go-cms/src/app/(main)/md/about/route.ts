import { getPage } from "@/lib/api";
import { aboutToMd, mdResponse } from "@/lib/markdown";

/** /md/about — 关于我们 Markdown。 */
export const revalidate = 300;

export async function GET() {
  const page = await getPage("about").catch(() => ({ title: "关于我们", content: "" }));
  return mdResponse(aboutToMd(page.title || "关于我们", page.content || ""));
}
