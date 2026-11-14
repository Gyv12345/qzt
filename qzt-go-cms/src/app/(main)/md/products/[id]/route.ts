import { notFound } from "next/navigation";
import { getProduct } from "@/lib/api";
import { mdResponse, productToMd } from "@/lib/markdown";

/** /md/products/:id — 产品详情 Markdown。 */
export const revalidate = 300;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  // 复用 HTML 详情页相同的静态参数集。
  // 静态导出(output:export)要求动态路由至少预渲染一个参数:
  // 后端不可达时给占位 id "0" — GET 时 getProduct 必然失败走 notFound,
  // 该路径会被 exporter 跳过, build 不炸也不产出无效文件。
  const { getProducts } = await import("@/lib/api");
  try {
    const { list } = await getProducts({ page_size: 50 });
    return list.map((p) => ({ id: String(p.id) }));
  } catch {
    return [{ id: "0" }];
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
