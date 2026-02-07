import Link from "next/link";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

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

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="text-2xl font-heading font-bold text-primary">
              企账通
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              专业的企业客户管理解决方案，助力企业实现数字化转型。
            </p>
            <div className="mt-6 flex space-x-4">
              <a
                href="https://github.com"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="sr-only">GitHub</span>
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="sr-only">Twitter</span>
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="mailto:contact@qzt.example.com"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="sr-only">Email</span>
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
          {Object.entries(footerNav).map(([title, items]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold leading-6 text-foreground">
                {title === "product" && "产品"}
                {title === "company" && "公司"}
                {title === "resources" && "资源"}
                {title === "legal" && "法律"}
              </h3>
              <ul role="list" className="mt-6 space-y-4">
                {items.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-muted pt-8">
          <p className="text-center text-xs leading-5 text-muted-foreground">
            &copy; {new Date().getFullYear()} 企账通. 保留所有权利.
          </p>
        </div>
      </div>
    </footer>
  );
}
