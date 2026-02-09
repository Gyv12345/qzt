"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const nav = [
  { name: "首页", href: "/" },
  { name: "关于我们", href: "/about" },
  { name: "文章", href: "/articles" },
  { name: "案例", href: "/cases" },
  { name: "产品", href: "/products" },
  { name: "人员", href: "/profiles" },
  { name: "联系我们", href: "/contact" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-lg shadow-sm border-b border-slate-200/50"
          : "bg-white/80 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
        <div className="flex lg:flex-1">
          <Link
            href="/"
            className="-m-1.5 p-1.5 flex items-center gap-2 group"
          >
            <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 p-0.5 transition-transform duration-300 group-hover:scale-105">
              <div className="flex h-full w-full items-center justify-center rounded-lg bg-white">
                <img src="/logo.png" alt="企智通" className="h-7 w-auto" />
              </div>
            </div>
            <span className="text-xl font-heading font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              企智通
            </span>
          </Link>
        </div>

        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-lg p-2.5 text-slate-700 transition-colors hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">打开主菜单</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="hidden lg:flex lg:gap-x-1">
          {nav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="relative px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-blue-600 rounded-lg hover:bg-blue-50/50"
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-700 transition-colors hover:text-blue-600"
          >
            登录
          </Link>
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105"
          >
            <Link href="/contact">立即咨询</Link>
          </Button>
        </div>
      </nav>

      {/* Mobile menu with animation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden"
          >
            <div className="space-y-1 px-6 pb-6 pt-2">
              {nav.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className="block rounded-lg px-4 py-3 text-base font-semibold leading-7 text-slate-900 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: nav.length * 0.05 }}
                className="pt-4 space-y-3"
              >
                <Link
                  href="/login"
                  className="block text-center text-base font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  登录
                </Link>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                >
                  <Link href="/contact">立即咨询</Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
