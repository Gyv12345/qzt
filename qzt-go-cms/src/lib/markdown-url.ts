import { defaultUrlTransform, type UrlTransform } from "react-markdown";

// react-markdown v10 默认 urlTransform 白名单只放行 http/https/mailto/irc，
// tel:/sms: 会被剥成空 href（/p/demo 电话链接 href="" 根因）。
// 这里放行 tel:/sms:，其余沿用默认白名单。
export const allowTelUrlTransform: UrlTransform = (url) =>
  url.startsWith("tel:") || url.startsWith("sms:") ? url : defaultUrlTransform(url);
