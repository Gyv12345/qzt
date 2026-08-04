import { notFound } from "next/navigation";
import { getProduct } from "@/lib/api";
import { mdResponse, productToMd } from "@/lib/markdown";

/** /md/products/:id — 产品详情 Markdown。 */
export const revalidate = 300;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  // 复用 HTML 详情页相同的静态参数集 (运行时无后端则返回空, 走 ISR 按需生成)。
  const { getProducts } = await import("@/lib/api");
  try {
    const { list } = await getProducts({ page_size: 50 });
    return list.map((p) => ({ id: String(p.id) }));
  } catch {
    return [];
  }
}

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  try {
    const product = await getProduct(id);
    return mdResponse(productToMd(product));
  } catch {
    notFound();
  }
}
