import Link from "next/link";
import { NAV, SITE } from "@/lib/site";
import { getSiteConfig, getPage } from "@/lib/api";

/** 开源仓库地址, 与 layout.tsx 结构化数据 sameAs 保持一致 */
const GITHUB_URL = "https://github.com/Gyv12345/qzt";

/** 底部页脚。深色块收束页面, 文字反白, 营造层级感。 */
export async function Footer() {
  let siteName = SITE.name;
  let logoUrl = "";
  let icp = "";
  let policeBeian = "";
  let policeBeianUrl = "";
  let copyright = "";
  let phone = "";
  let email = "";
  let address = "";
  let workHours = "";

  // 隐私政策链接构建时探测:页面未发布(草稿/被误下线)时不再渲染入口,
  // 避免静态页脚出现死链(R62 D1:页面下线后页脚链接 404)。
  let privacyLive = false;
  try {
    await getPage("privacy");
    privacyLive = true;
  } catch {
    // 草稿态/不存在 → 不渲染链接
  }

  try {
    const cfg = await getSiteConfig();
    if (cfg.site_name) siteName = cfg.site_name;
    if (cfg.logo_url) logoUrl = cfg.logo_url;
    icp = cfg.icp_beian || "";
    policeBeian = cfg.public_security_beian || "";
    policeBeianUrl = cfg.public_security_beian_url || "";
    copyright = cfg.copyright || "";
    phone = cfg.contact_phone || "";
    email = cfg.contact_email || "";
    address = cfg.contact_address || "";
    workHours = cfg.work_hours || "";
  } catch {
    // 接口失败时降级为静态常量
  }

  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-line bg-deep text-muted">
      <div className="container grid gap-8 py-14 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName} className="h-9 w-auto max-w-[180px] object-contain" />
            ) : (
              <>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 font-display text-sm font-bold text-white shadow-glow-sm">
                  {siteName.slice(0, 1)}
                </span>
                <p className="font-display text-lg font-bold text-strong">{siteName}</p>
              </>
            )}
          </div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-faint">{SITE.description}</p>
        </div>
        <nav className="flex flex-col gap-2.5">
          <p className="font-display text-sm font-semibold text-strong">导航</p>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-faint no-underline transition-colors hover:text-strong"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div>
          <p className="font-display text-sm font-semibold text-strong">联系方式</p>
          {phone && <p className="mt-3 text-sm leading-6 text-faint">电话: {phone}</p>}
          {email && <p className="text-sm leading-6 text-faint">邮箱: {email}</p>}
          {address && <p className="text-sm leading-6 text-faint">地址: {address}</p>}
          {workHours && <p className="text-sm leading-6 text-faint">{workHours}</p>}
          {!phone && !email && !address && (
            <>
              <p className="mt-3 text-sm leading-6 text-faint">商务合作 / 售后咨询</p>
              <p className="text-sm leading-6 text-faint">请通过官网留言或来电</p>
            </>
          )}
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-strong">关于</p>
          <p className="mt-3 text-sm leading-6 text-faint">企业级业务管理平台</p>
          <p className="text-sm leading-6 text-faint">私有化部署 · 模块自由组合</p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-sm leading-6 text-faint no-underline transition-colors hover:text-strong"
          >
            开源仓库: github.com/Gyv12345/qzt
          </a>
        </div>
      </div>
      <div className="border-t border-line py-5">
        <div className="container flex flex-col items-center gap-2 text-center text-xs text-faint">
          <p>{copyright || `© ${year} ${siteName}. All rights reserved.`}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {/* 隐私政策:收集个人信息(留言表单/第一方埋点)的 PIPL 告知入口(构建时探测,未发布不渲染) */}
            {privacyLive && (
              <Link href="/p/privacy" className="text-faint no-underline transition-colors hover:text-muted">
                隐私政策
              </Link>
            )}
            {icp && (
              <a
                href="https://beian.miit.gov.cn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-faint no-underline transition-colors hover:text-muted"
              >
                {icp}
              </a>
            )}
            {policeBeian && (
              <a
                href={policeBeianUrl || "https://beian.mps.gov.cn"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-faint no-underline transition-colors hover:text-muted"
              >
                {policeBeian}
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
