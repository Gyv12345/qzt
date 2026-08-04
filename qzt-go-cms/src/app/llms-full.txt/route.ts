import { getArticles, getPartners, getProduct, getProducts, getTeam } from "@/lib/api";
import { getPage } from "@/lib/api";
import { llmsFullTxt, mdResponse } from "@/lib/markdown";

/**
 * /llms-full.txt — 全站内容合集, 一个 Markdown 文件含所有详情。
 * 适合给 AI 一次性消化整站内容。
 */
export const revalidate = 300;

export async function GET() {
  const [productsRes, articlesRes, partnersRes, teamRes, aboutRes] = await Promise.all([
    getProducts({ page_size: 200 }).catch(() => ({ list: [], total: 0 })),
    getArticles({ page_size: 200 }).catch(() => ({ list: [], total: 0 })),
    getPartners({ page_size: 200 }).catch(() => ({ list: [], total: 0 })),
    getTeam({ page_size: 200 }).catch(() => ({ list: [], total: 0 })),
    getPage("about").catch(() => ({ title: "关于我们", content: "" })),
  ]);

  // 拉取每个产品的详情 (含价格), 逐个请求, 失败的用基础信息兜底。
  const products = await Promise.all(
    productsRes.list.map(async (p) => {
      try {
        return await getProduct(p.id);
      } catch {
        return { ...p, prices: [] };
      }
    }),
  );

  const body = llmsFullTxt({
    products,
    articles: articlesRes.list,
    partners: partnersRes.list,
    team: teamRes.list,
    about: { title: aboutRes.title || "关于我们", content: aboutRes.content || "" },
  });

  return mdResponse(body, { maxAge: 600 });
}
