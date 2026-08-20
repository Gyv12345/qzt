import { NextResponse } from "next/server";

/**
 * 官网留言的服务端代理:浏览器 POST 同源 /api/contact,由 Next 服务端转发到 Go 后端。
 * 必须走服务端代理的原因:NEXT_PUBLIC_API_BASE 在构建期被内联进浏览器包,
 * 生产值是服务器内网地址(http://127.0.0.1:9000),访客浏览器根本访问不到。
 */
export async function POST(req: Request) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:9000";

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ code: 40000, msg: "请求体格式错误" }, { status: 400 });
  }

  try {
    const upstream = await fetch(apiBase + "/crm/public/contact", {
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
