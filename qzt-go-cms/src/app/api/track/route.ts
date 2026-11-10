import { NextResponse } from "next/server";

/**
 * 官网埋点的服务端代理:浏览器 POST 同源 /api/track,由 Next 服务端转发到 Go 后端
 * 的 /cms/public/track(批量落库 cms_track_event)。
 *
 * 与 /api/contact 同理:NEXT_PUBLIC_API_BASE 是服务器内网地址,浏览器不可达,
 * 必须经 Next 服务端转发。上游地址模块加载期固化、协议白名单、路径固定,无 SSRF 面。
 * 埋点只写日志表,失败静默(返回 200)以免影响页面与 sendBeacon。
 */
const TRACK_UPSTREAM = (() => {
  const u = new URL(process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:9000");
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`NEXT_PUBLIC_API_BASE 协议非法: ${u.protocol}`);
  }
  u.pathname = "/cms/public/track";
  u.search = "";
  u.hash = "";
  return u;
})();

/** 单批请求体上限(客户端单批 20 条 × 单条 ~2KB props,留余量) */
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(req: Request) {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    // 超限直接吞掉:埋点是旁路数据,不值得让客户端重试
    return NextResponse.json({ code: 0, msg: "ok", data: { accepted: 0 } });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ code: 0, msg: "ok", data: { accepted: 0 } });
  }

  try {
    // 透传 nginx 传来的真实 IP 头:后端经本代理直达 127.0.0.1:9000,
    // 不转发的话 Go 侧 ClientIP() 只能看到 127.0.0.1。
    const fwd: Record<string, string> = { "Content-Type": "application/json" };
    for (const h of ["x-forwarded-for", "x-real-ip"]) {
      const v = req.headers.get(h);
      if (v) fwd[h] = v;
    }
    const upstream = await fetch(TRACK_UPSTREAM, {
      method: "POST",
      headers: fwd,
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ code: 0, msg: "ok", data: { accepted: 0 } });
  }
}
