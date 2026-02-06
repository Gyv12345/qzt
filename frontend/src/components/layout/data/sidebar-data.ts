import {
  LayoutDashboard,
  Command,
  Building,
  BarChart3,
  UserCircle,
  UsersRound,
  PieChart,
  Receipt,
  Wallet,
  Users,
  ShieldCheck,
  Lock,
  Archive,
  FileText,
  FileCheck,
  Settings,
  FileSignature,
  Webhook,
} from "lucide-react";
import { type SidebarData } from "../types";

export const sidebarData: SidebarData = {
  user: {
    name: "Admin",
    email: "admin@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "企账通 SCRM",
      logo: Command,
      plan: "企业版",
    },
  ],
  navGroups: [
    {
      title: "业务",
      items: [
        {
          title: "工作台",
          url: "/",
          icon: LayoutDashboard,
        },
        {
          title: "销售管理",
          icon: BarChart3,
          items: [
            {
              title: "联系人管理",
              url: "/contacts",
              icon: UserCircle,
            },
            {
              title: "客户管理",
              url: "/customers",
              icon: Building,
            },
            {
              title: "合同管理",
              url: "/contracts",
              icon: FileCheck,
            },
            {
              title: "服务团队",
              url: "/service-teams",
              icon: UsersRound,
            },
          ],
        },
        {
          title: "财务管理",
          icon: PieChart,
          items: [
            {
              title: "发票管理",
              url: "/invoices",
              icon: Receipt,
            },
            {
              title: "收款管理",
              url: "/payments",
              icon: Wallet,
            },
          ],
        },
        // 隐藏的任务、应用、聊天菜单
        // {
        //   title: '任务',
        //   url: '/tasks',
        //   icon: ListTodo,
        // },
        // {
        //   title: '应用',
        //   url: '/apps',
        //   icon: Package,
        // },
        // {
        //   title: '聊天',
        //   url: '/chats',
        //   badge: '3',
        //   icon: MessagesSquare,
        // },
      ],
    },
    {
      title: "业务设置",
      items: [
        {
          title: "产品管理",
          url: "/products",
          icon: Archive,
        },
        {
          title: "合同模板设置",
          url: "/contract-templates",
          icon: FileSignature,
        },
        {
          title: "客户规则",
          url: "/customer-rules",
          icon: ShieldCheck,
        },
        {
          title: "Webhook配置",
          url: "/webhooks",
          icon: Webhook,
        },
      ],
    },
    {
      title: "系统设置",
      items: [
        {
          title: "用户管理",
          url: "/users",
          icon: Users,
        },
        {
          title: "部门管理",
          url: "/departments",
          icon: Building,
        },
        {
          title: "角色管理",
          url: "/roles",
          icon: ShieldCheck,
        },
        {
          title: "权限管理",
          url: "/permissions",
          icon: Lock,
        },
        {
          title: "日志管理",
          icon: FileText,
          items: [
            {
              title: "登录日志",
              url: "/login-logs",
            },
            {
              title: "操作日志",
              url: "/operation-logs",
            },
          ],
        },
      ],
    },
    // {
    //   title: '页面',
    //   items: [
    //     {
    //       title: '认证',
    //       icon: ShieldCheck,
    //       items: [
    //         {
    //           title: '登录',
    //           url: '/login',
    //         },
    //       ],
    //     },
    //     {
    //       title: '错误页',
    //       icon: Bug,
    //       items: [
    //         {
    //           title: '未授权',
    //           url: '/401',
    //           icon: Lock,
    //         },
    //         {
    //           title: '禁止访问',
    //           url: '/403',
    //           icon: UserX,
    //         },
    //         {
    //           title: '未找到',
    //           url: '/404',
    //           icon: FileX,
    //         },
    //         {
    //           title: '服务器错误',
    //           url: '/500',
    //           icon: ServerOff,
    //         },
    //         {
    //           title: '维护中',
    //           url: '/503',
    //           icon: Construction,
    //         },
    //       ],
    //     },
    //   ],
    // },
    // {
    //   title: '其他',
    //   items: [
    //     {
    //       title: '设置',
    //       icon: Settings,
    //       items: [
    //         {
    //           title: '个人资料',
    //           url: '/settings',
    //           icon: UserCog,
    //         },
    //         {
    //           title: '账号',
    //           url: '/settings/account',
    //           icon: Wrench,
    //         },
    //         {
    //           title: '外观',
    //           url: '/settings/appearance',
    //           icon: Palette,
    //         },
    //         {
    //           title: '通知',
    //           url: '/settings/notifications',
    //           icon: Bell,
    //         },
    //         {
    //           title: '显示',
    //           url: '/settings/display',
    //           icon: Monitor,
    //         },
    //       ],
    //     },
    //     {
    //       title: '帮助中心',
    //       url: '/help-center',
    //       icon: HelpCircle,
    //     },
    //   ],
    // },
  ],
};
