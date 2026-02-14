"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Users,
  Target,
  Lightbulb,
  Award,
  Building2,
  TrendingUp,
  ArrowRight,
  Mail,
  Phone,
} from "lucide-react";
import type { PublicUser } from "@/lib/api";

interface AboutPageContentProps {
  users: PublicUser[];
}

export function AboutPageContent({ users }: AboutPageContentProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/50 py-24 lg:py-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute right-1/4 top-1/4 h-96 w-96 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-transparent blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
          >
            <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              关于
              <span className="mt-2 block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                企智通
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              专注企业客户关系管理领域，通过技术创新与服务升级，
              帮助企业实现数字化转型的愿景，让客户管理更简单、更高效。
            </p>
          </motion.div>
        </div>
      </section>

      {/* 公司简介 */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
            >
              <h2 className="text-3xl font-heading font-bold tracking-tight text-slate-900 sm:text-4xl">
                公司简介
              </h2>
              <div className="mt-8 space-y-6 text-lg leading-relaxed text-slate-600">
                <p>
                  企智通（QZT）成立于2020年，是一家专注于企业客户关系管理（CRM）
                  解决方案的科技公司。我们致力于通过先进的技术和专业的服务，
                  帮助企业实现客户管理的数字化转型。
                </p>
                <p>
                  经过几年的发展，企智通已服务超过1000家企业客户，
                  覆盖制造业、服务业、互联网等多个行业。
                  我们的产品以简洁易用、功能实用、价格透明而获得用户的广泛认可。
                </p>
                <p>
                  展望未来，我们将继续投入研发，不断创新，
                  为企业提供更优质的产品和服务，助力企业实现可持续增长。
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 发展历程 */}
      <section className="relative overflow-hidden bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="text-3xl font-heading font-bold tracking-tight text-slate-900 sm:text-4xl">
              发展历程
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              从创立到成长，我们始终不忘初心
            </p>
          </motion.div>

          <div className="mx-auto mt-16 max-w-5xl">
            <div className="relative">
              {/* 时间线 */}
              <div className="absolute left-8 top-0 h-full w-0.5 bg-slate-200 lg:left-1/2 lg:-translate-x-px" />

              {/* 里程碑 */}
              {[
                {
                  year: "2020",
                  title: "公司成立",
                  description: "企智通在深圳成立，开始 CRM 产品的研发",
                },
                {
                  year: "2021",
                  title: "产品发布",
                  description: "推出企智通 1.0 版本，首批客户签约使用",
                },
                {
                  year: "2022",
                  title: "快速成长",
                  description: "客户数量突破 300 家，推出专业版和企业版",
                },
                {
                  year: "2023",
                  title: "功能升级",
                  description: "新增智能分配、数据分析等核心功能",
                },
                {
                  year: "2024",
                  title: "规模化发展",
                  description: "服务客户超过 1000 家，成为行业领先品牌",
                },
              ].map((milestone, index) => (
                <motion.div
                  key={milestone.year}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: index * 0.1 }}
                  className={`relative mb-12 lg:mb-16 ${
                    index % 2 === 0
                      ? "lg:pr-1/2 lg:text-right"
                      : "lg:ml-auto lg:pl-1/2 lg:w-1/2"
                  }`}
                >
                  <div className="ml-20 lg:ml-0">
                    <div className="relative inline-flex items-center gap-4 lg:flex-row-reverse">
                      {/* 时间点 */}
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-xl font-bold text-white shadow-lg shadow-blue-500/25 lg:absolute lg:-left-8 lg:translate-x-1/2">
                        {milestone.year}
                      </div>
                      {/* 内容 */}
                      <div className="glass rounded-2xl border border-white/60 bg-white p-6 shadow-lg">
                        <h3 className="text-xl font-bold text-slate-900">
                          {milestone.title}
                        </h3>
                        <p className="mt-2 text-slate-600">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 企业文化 */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="text-3xl font-heading font-bold tracking-tight text-slate-900 sm:text-4xl">
              企业文化
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              我们的价值观指引着每一项决策
            </p>
          </motion.div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Target,
                title: "客户第一",
                description: "始终以客户价值为导向，为客户创造真实价值",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: Lightbulb,
                title: "持续创新",
                description: "不断探索新技术、新方法，推动产品持续进化",
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: Users,
                title: "团队协作",
                description: "相信团队的力量，相互支持，共同成长",
                color: "from-orange-500 to-red-500",
              },
              {
                icon: Award,
                title: "追求卓越",
                description: "对产品细节精益求精，对服务质量严格要求",
                color: "from-green-500 to-emerald-500",
              },
            ].map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: index * 0.1 }}
              >
                <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
                  <div
                    className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${value.color} shadow-lg`}
                  >
                    <value.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {value.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 核心数据 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 py-24 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="text-3xl font-heading font-bold tracking-tight sm:text-4xl">
              用数据说话
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              每一个数字背后，都是我们对客户的承诺
            </p>
          </motion.div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: "1000+", label: "服务企业", icon: Building2 },
              { value: "95%", label: "客户满意度", icon: Award },
              { value: "85%", label: "续费率", icon: TrendingUp },
              { value: "24/7", label: "技术支持", icon: Users },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                  <stat.icon className="h-8 w-8" />
                </div>
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="mt-2 text-blue-200">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 团队介绍 */}
      {users.length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
              className="mx-auto max-w-3xl text-center"
            >
              <h2 className="text-3xl font-heading font-bold tracking-tight text-slate-900 sm:text-4xl">
                核心团队
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                专业的团队，专业的服务
              </p>
            </motion.div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: index * 0.1 }}
                >
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
                    {/* 头像 */}
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-2xl font-bold text-white shadow-lg">
                        {user.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>

                    {/* 姓名 */}
                    <h3 className="text-center text-lg font-bold text-slate-900">
                      {user.name}
                    </h3>

                    {/* 部门 */}
                    {user.department && (
                      <p className="mt-1 text-center text-sm text-muted-foreground">
                        {user.department.name}
                      </p>
                    )}

                    {/* 角色 */}
                    {user.roles.length > 0 && (
                      <div className="mt-3 flex flex-wrap justify-center gap-1">
                        {user.roles.slice(0, 2).map(({ role }) => (
                          <span
                            key={role.id}
                            className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                          >
                            {role.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 联系方式 */}
                    <div className="mt-4 space-y-1 text-center text-sm text-muted-foreground">
                      {user.email && (
                        <div className="flex items-center justify-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      )}
                      {user.phone && (
                        <div className="flex items-center justify-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden bg-slate-50 py-24">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
          >
            <h2 className="text-3xl font-heading font-bold tracking-tight text-slate-900 sm:text-4xl">
              加入我们，共创未来
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              如果您对我们的产品感兴趣，或希望加入我们的团队，
              欢迎随时联系我们。
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105"
                asChild
              >
                <Link href="/contact">联系我们</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-300 bg-white/80 text-slate-700 backdrop-blur-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                asChild
              >
                <Link href="/articles">了解更多</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
