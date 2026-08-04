import { mdIndex, mdResponse } from "@/lib/markdown";

/** /md — Markdown 板块索引。 */
export const revalidate = 300;

export function GET() {
  return mdResponse(mdIndex());
}
