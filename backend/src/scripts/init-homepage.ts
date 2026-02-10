/**
 * 初始化首页数据脚本
 * 创建一个示例首页配置
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function initHomepage() {
  console.log("开始初始化首页数据...");

  // 检查是否已存在
  const existing = await prisma.cmsPage.findUnique({
    where: { slug: "homepage" },
  });

  if (existing) {
    console.log("首页已存在，跳过创建");
    return;
  }

  // 创建首页
  const homepage = await prisma.cmsPage.create({
    data: {
      name: "homepage",
      title: "首页",
      slug: "homepage",
      description: "企智通官网首页",
      status: "PUBLISHED",
      publishedAt: new Date(),
      elements: {
        create: [
          // HERO 区域 - 主标题
          {
            sectionType: "HERO",
            elementType: "heading",
            sortOrder: 0,
            content: JSON.stringify({
              text: "企业客户管理",
            }),
            visible: true,
          },
          // HERO 区域 - 副标题
          {
            sectionType: "HERO",
            elementType: "heading",
            sortOrder: 1,
            content: JSON.stringify({
              text: "新时代的智能选择",
            }),
            visible: true,
          },
          // HERO 区域 - 描述
          {
            sectionType: "HERO",
            elementType: "text",
            sortOrder: 2,
            content: JSON.stringify({
              text: "企智通为您提供一站式企业客户关系管理解决方案，助力企业实现数字化转型，提升运营效率。",
            }),
            visible: true,
          },
          // HERO 区域 - 主按钮
          {
            sectionType: "HERO",
            elementType: "button",
            sortOrder: 3,
            content: JSON.stringify({
              text: "免费试用 30 天",
              url: "#contact",
              isPrimary: true,
            }),
            visible: true,
          },
          // HERO 区域 - 次按钮
          {
            sectionType: "HERO",
            elementType: "button",
            sortOrder: 4,
            content: JSON.stringify({
              text: "观看演示",
              url: "/demo",
              isPrimary: false,
            }),
            visible: true,
          },
          // STATS 区域 - 服务企业
          {
            sectionType: "STATS",
            elementType: "statistic",
            sortOrder: 0,
            content: JSON.stringify({
              label: "服务企业",
              value: 10000,
              suffix: "+",
              color: "from-blue-500 to-cyan-500",
              bgColor: "bg-blue-50",
            }),
            visible: true,
          },
          // STATS 区域 - 活跃用户
          {
            sectionType: "STATS",
            elementType: "statistic",
            sortOrder: 1,
            content: JSON.stringify({
              label: "活跃用户",
              value: 50000,
              suffix: "+",
              color: "from-purple-500 to-pink-500",
              bgColor: "bg-purple-50",
            }),
            visible: true,
          },
          // STATS 区域 - 客户满意度
          {
            sectionType: "STATS",
            elementType: "statistic",
            sortOrder: 2,
            content: JSON.stringify({
              label: "客户满意度",
              value: 99,
              suffix: "%",
              color: "from-green-500 to-emerald-500",
              bgColor: "bg-green-50",
            }),
            visible: true,
          },
          // STATS 区域 - 技术支持
          {
            sectionType: "STATS",
            elementType: "statistic",
            sortOrder: 3,
            content: JSON.stringify({
              label: "技术支持",
              value: 24,
              suffix: "/7",
              color: "from-orange-500 to-red-500",
              bgColor: "bg-orange-50",
            }),
            visible: true,
          },
          // FEATURES 区域 - 快速部署
          {
            sectionType: "FEATURES",
            elementType: "card",
            sortOrder: 0,
            content: JSON.stringify({
              title: "快速部署",
              description: "5分钟即可完成部署，无需复杂配置，开箱即用",
              gradient: "from-yellow-400 to-orange-500",
              bgGradient: "from-yellow-50 to-orange-50",
            }),
            visible: true,
          },
          // FEATURES 区域 - 安全可靠
          {
            sectionType: "FEATURES",
            elementType: "card",
            sortOrder: 1,
            content: JSON.stringify({
              title: "安全可靠",
              description: "企业级安全保障，数据加密存储，多维度权限控制",
              gradient: "from-green-400 to-emerald-500",
              bgGradient: "from-green-50 to-emerald-50",
            }),
            visible: true,
          },
          // FEATURES 区域 - 数据分析
          {
            sectionType: "FEATURES",
            elementType: "card",
            sortOrder: 2,
            content: JSON.stringify({
              title: "数据分析",
              description: "强大的数据分析和报表功能，助力科学决策",
              gradient: "from-blue-400 to-cyan-500",
              bgGradient: "from-blue-50 to-cyan-50",
            }),
            visible: true,
          },
          // FEATURES 区域 - 客户管理
          {
            sectionType: "FEATURES",
            elementType: "card",
            sortOrder: 3,
            content: JSON.stringify({
              title: "客户管理",
              description: "360度客户画像，全生命周期管理，提升客户满意度",
              gradient: "from-purple-400 to-pink-500",
              bgGradient: "from-purple-50 to-pink-50",
            }),
            visible: true,
          },
          // FEATURES 区域 - 消息通知
          {
            sectionType: "FEATURES",
            elementType: "card",
            sortOrder: 4,
            content: JSON.stringify({
              title: "消息通知",
              description: "多渠道消息推送，及时跟进客户，把握商机",
              gradient: "from-red-400 to-pink-500",
              bgGradient: "from-red-50 to-pink-50",
            }),
            visible: true,
          },
          // FEATURES 区域 - 全球服务
          {
            sectionType: "FEATURES",
            elementType: "card",
            sortOrder: 5,
            content: JSON.stringify({
              title: "全球服务",
              description: "支持多语言、多币种，助力企业走向全球",
              gradient: "from-cyan-400 to-blue-500",
              bgGradient: "from-cyan-50 to-blue-50",
            }),
            visible: true,
          },
          // CTA 区域 - 优势列表
          {
            sectionType: "CTA",
            elementType: "text",
            sortOrder: 0,
            content: JSON.stringify({
              text: "无需信用卡",
            }),
            visible: true,
          },
          {
            sectionType: "CTA",
            elementType: "text",
            sortOrder: 1,
            content: JSON.stringify({
              text: "5分钟快速部署",
            }),
            visible: true,
          },
          {
            sectionType: "CTA",
            elementType: "text",
            sortOrder: 2,
            content: JSON.stringify({
              text: "24/7技术支持",
            }),
            visible: true,
          },
          {
            sectionType: "CTA",
            elementType: "text",
            sortOrder: 3,
            content: JSON.stringify({
              text: "随时取消",
            }),
            visible: true,
          },
          // CTA 区域 - 按钮
          {
            sectionType: "CTA",
            elementType: "button",
            sortOrder: 4,
            content: JSON.stringify({
              text: "免费开始使用",
              url: "/signup",
            }),
            visible: true,
          },
        ],
      },
    },
  });

  console.log("首页创建成功:", homepage.slug);
}

initHomepage()
  .then(() => {
    console.log("初始化完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("初始化失败:", error);
    process.exit(1);
  });
