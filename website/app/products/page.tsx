import { ProductsContent } from "@/components/products/products-content";
import { getProducts } from "@/lib/api";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "产品展示 - 企智通",
  description: "了解企智通的产品功能与版本，选择最适合您企业的客户关系管理解决方案。",
};

export const revalidate = 3600; // ISR 缓存 1 小时

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = 9;

  const productsResult = await getProducts({ page, pageSize });
  const { data: products, totalPages } = productsResult;

  return (
    <ProductsContent products={products} totalPages={totalPages} page={page} />
  );
}
