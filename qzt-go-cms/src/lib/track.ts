/**
 * 官网第一方埋点:轻量批量上报,数据落自家库(cms_track_event),不经任何第三方。
 *
 * - 匿名访客:localStorage 生成 UUID,不含任何个人身份信息;IP/UA 由服务端从请求提取
 * - 批量:队列 5 秒或攒满 20 条 flush;页面隐藏/关闭时经 sendBeacon 兜底
 * - 传输:同源 /api/track(Next 服务端代理转发后端,浏览器直连不到内网 API)
 * - 静默:任何失败都不抛错,埋点绝不影响页面
 */

const ENDPOINT = "/api/track";
const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 20;
const VISITOR_KEY = "qzt-cms:visitor";
const SESSION_KEY = "qzt-cms:session";

export interface TrackProps {
  path?: string;
  title?: string;
  referrer?: string;
  [key: string]: unknown;
}

/** 稳定匿名 ID。存储被禁用(如隐私模式)时退化为会话内随机值。 */
export function visitorId(): string {
  try {
    const existed = localStorage.getItem(VISITOR_KEY);
    if (existed) return existed;
    const id = newId();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return newId();
  }
}

/** 会话 ID:浏览器标签页生命周期。 */
export function sessionId(): string {
  try {
    const existed = sessionStorage.getItem(SESSION_KEY);
    if (existed) return existed;
    const id = newId();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return newId();
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

let queue: TrackProps[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let pagehideHooked = false;

function ensurePagehideHook() {
  if (pagehideHooked || typeof window === "undefined") return;
  pagehideHooked = true;
  // 离开页面(关闭/跳转/切后台)时把剩余队列立刻带走
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

/** 立即上报当前队列(sendBeacon 优先,退化为 keepalive fetch)。 */
export function flush(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0 || typeof window === "undefined") return;
  const batch = queue.splice(0, MAX_BATCH);
  const body = JSON.stringify({
    events: batch.map((e) => ({
      event: e.event,
      path: clip(String(e.path ?? window.location.pathname), 255),
      title: clip(String(e.title ?? document.title), 255),
      referrer: clip(String(e.referrer ?? document.referrer), 500),
      visitor_id: visitorId(),
      session_id: sessionId(),
      props: restProps(e),
    })),
  });
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon && blob.size < 60_000) {
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }
  } catch {
    /* 走 fetch 兜底 */
  }
  try {
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* 静默 */
  }
}

function restProps(e: TrackProps): Record<string, unknown> | undefined {
  const { event: _event, path: _path, title: _title, referrer: _referrer, ...rest } = e;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

/** 记录一个事件。event 只允许字母/数字/下划线(与服务端校验一致)。 */
export function track(event: string, props?: Record<string, unknown>, extra?: TrackProps): void {
  if (typeof window === "undefined") return;
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(event)) return;
  ensurePagehideHook();
  queue.push({ event, ...extra, ...props });
  if (queue.length >= MAX_BATCH) {
    flush();
    return;
  }
  if (!timer) timer = setTimeout(flush, FLUSH_INTERVAL_MS);
}
