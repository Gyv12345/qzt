import { getProducts } from "@/lib/api";
import { mdResponse, productListToMd } from "@/lib/markdown";

/** /md/products — 产品列表 Markdown。
 *  落在 products/index/ 以避开静态导出中列表文件与详情子目录冲突;对外 /md/products 由 nginx rewrite。 */
export const revalidate = 300;

export async function GET() {
  const { list } = await getProducts({ page_size: 100 }).catch(() => ({ list: [], total: 0 }));
  return mdResponse(productListToMd(list));
}
