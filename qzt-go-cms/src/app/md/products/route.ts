import { getProducts } from "@/lib/api";
import { mdResponse, productListToMd } from "@/lib/markdown";

/** /md/products — 产品列表 Markdown。 */
export const revalidate = 300;

export async function GET() {
  const { list } = await getProducts({ page_size: 200 }).catch(() => ({ list: [], total: 0 }));
  return mdResponse(productListToMd(list));
}
