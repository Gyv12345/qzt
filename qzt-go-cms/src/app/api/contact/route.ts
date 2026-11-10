import { NextResponse } from "next/server";

/**
 * 官网留言的服务端代理:浏览器 POST 同源 /api/contact,由 Next 服务端转发到 Go 后端。
 * 必须走服务端代理的原因:NEXT_PUBLIC_API_BASE 在构建期被内联进浏览器包,
 * 生产值是服务器内网地址(http://127.0.0.1:9000),访客浏览器根本访问不到。
 *
 * 上游地址在模块加载期固化为常量(仅部署配置决定,与请求输入零关联),
 * 协议白名单 http/https,路径固定——即使未来有人把 apiBase 误接请求参数,
 * 这里也不构成 SSRF 面。
 */
const CONTACT_UPSTREAM = (() => {
  const u = new URL(process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:9000");
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`NEXT_PUBLIC_API_BASE 协议非法: ${u.protocol}`);
  }
  u.pathname = "/crm/public/contact";
  u.search = "";
  u.hash = "";
  return u;
})();

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ code: 40000, msg: "请求体格式错误" }, { status: 400 });
  }

  try {
    const upstream = await fetch(CONTACT_UPSTREAM, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { code: 50000, msg: "服务暂时不可用,请稍后重试" },
      { status: 502 },
    );
  }
}
