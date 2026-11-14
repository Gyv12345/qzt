import { mdIndex, mdResponse } from "@/lib/markdown";

/** /md — Markdown 板块索引。
 *  静态导出(output:export)中 handler 平铺输出为文件,与 /md/* 子路由目录冲突,
 *  故本文件落在 app/md/index/(导出为 out/md/index);对外 /md 由 nginx rewrite 到 /md/index。 */
export const revalidate = 300;

export function GET() {
  return mdResponse(mdIndex());
}
