import Link from "next/link";
import { Github, Twitter, Linkedin, Mail, Heart } from "lucide-react";

const footerNav = {
  product: [
    { name: "功能介绍", href: "/features" },
    { name: "价格方案", href: "/pricing" },
    { name: "更新日志", href: "/changelog" },
    { name: "API 文档", href: "/docs" },
  ],
  company: [
    { name: "关于我们", href: "/about" },
    { name: "团队成员", href: "/team" },
    { name: "招贤纳士", href: "/careers" },
    { name: "联系我们", href: "/contact" },
  ],
  resources: [
    { name: "帮助中心", href: "/help" },
    { name: "博客文章", href: "/articles" },
    { name: "客户案例", href: "/cases" },
    { name: "开发者", href: "/developers" },
  ],
  legal: [
    { name: "隐私政策", href: "/privacy" },
    { name: "服务条款", href: "/terms" },
    { name: "Cookie 政策", href: "/cookies" },
  ],
};

const sectionTitles = {
  product: "产品",
  company: "公司",
  resources: "资源",
  legal: "法律",
};

const socialLinks = [
  { name: "GitHub", href: "https://github.com", icon: Github },
  { name: "Twitter", href: "https://twitter.com", icon: Twitter },
  { name: "LinkedIn", href: "https://linkedin.com", icon: Linkedin },
  { name: "Email", href: "mailto:contact@qzt.example.com", icon: Mail },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-slate-200/50 bg-gradient-to-b from-slate-50 to-white">
      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -bottom-40 h-96 w-96 rounded-full bg-gradient-to-br from-blue-100/30 via-purple-100/30 to-transparent blur-3xl" />
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-gradient-to-tl from-purple-100/30 via-pink-100/30 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
          {/* 品牌区域 */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
                <span className="text-lg font-bold text-white">Q</span>
              </div>
              <span className="text-xl font-heading font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                企智通
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              专业的企业客户管理解决方案，助力企业实现数字化转型。
              <br />
              让每一个客户关系都更有价值。
            </p>

            {/* 社交链接 */}
            <div className="mt-6 flex gap-3">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    className="group flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md hover:shadow-blue-500/10"
                    aria-label={link.name}
                  >
                    <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* 导航链接 */}
          {Object.entries(footerNav).map(([key, items]) => (
            <div key={key}>
              <h3 className="text-sm font-semibold text-slate-900">
                {sectionTitles[key as keyof typeof sectionTitles]}
              </h3>
              <ul role="list" className="mt-4 space-y-3">
                {items.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-slate-600 transition-colors hover:text-blue-600"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 底部版权信息 */}
        <div className="mt-12 border-t border-slate-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="flex items-center gap-1 text-sm text-slate-500">
              &copy; {currentYear} 企智通. 保留所有权利.
            </p>
            <p className="flex items-center gap-1 text-sm text-slate-500">
              Made with
              <Heart className="h-4 w-4 fill-red-500 text-red-500 animate-pulse" />
              for better business
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
