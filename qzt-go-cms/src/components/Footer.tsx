import Link from "next/link";
import { NAV, SITE } from "@/lib/site";
import { getSiteConfig } from "@/lib/api";

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
    <footer className="mt-20 border-t border-white/[0.06] bg-[#020409] text-slate-400">
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
                <p className="font-display text-lg font-bold text-white">{siteName}</p>
              </>
            )}
          </div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">{SITE.description}</p>
        </div>
        <nav className="flex flex-col gap-2.5">
          <p className="font-display text-sm font-semibold text-white">导航</p>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-slate-500 no-underline transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div>
          <p className="font-display text-sm font-semibold text-white">联系方式</p>
          {phone && <p className="mt-3 text-sm leading-6 text-slate-500">电话: {phone}</p>}
          {email && <p className="text-sm leading-6 text-slate-500">邮箱: {email}</p>}
          {address && <p className="text-sm leading-6 text-slate-500">地址: {address}</p>}
          {workHours && <p className="text-sm leading-6 text-slate-500">{workHours}</p>}
          {!phone && !email && !address && (
            <>
              <p className="mt-3 text-sm leading-6 text-slate-500">商务合作 / 售后咨询</p>
              <p className="text-sm leading-6 text-slate-500">请通过官网留言或来电</p>
            </>
          )}
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-white">关于</p>
          <p className="mt-3 text-sm leading-6 text-slate-500">企业级业务管理平台</p>
          <p className="text-sm leading-6 text-slate-500">私有化部署 · 模块自由组合</p>
        </div>
      </div>
      <div className="border-t border-white/[0.06] py-5">
        <div className="container flex flex-col items-center gap-2 text-center text-xs text-slate-600">
          <p>{copyright || `© ${year} ${siteName}. All rights reserved.`}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {icp && (
              <a
                href="https://beian.miit.gov.cn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 no-underline transition-colors hover:text-slate-400"
              >
                {icp}
              </a>
            )}
            {policeBeian && (
              <a
                href={policeBeianUrl || "https://beian.mps.gov.cn"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 no-underline transition-colors hover:text-slate-400"
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
