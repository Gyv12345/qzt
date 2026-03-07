import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * CMS 内容种子数据
 *
 * 运行方式：
 * 1. cd backend
 * 2. npx ts-node prisma/seed.cms.ts
 */

async function main() {
  console.log("🌱 开始填充 CMS 内容数据...");

  // 获取或创建默认用户（作者）
  let author = await prisma.user.findFirst({
    where: { username: "admin" },
  });

  if (!author) {
    console.log("⚠️  未找到 admin 用户，请先创建用户");
    return;
  }

  console.log(`✓ 使用作者: ${author.name} (${author.username})`);

  // 清理现有数据（可选，谨慎使用）
  // await prisma.cmsContentTag.deleteMany({});
  // await prisma.cmsContent.deleteMany({});
  // await prisma.cmsTag.deleteMany({});

  // ==================== 创建标签 ====================
  console.log("\n📁 创建标签...");

  const tagsData = [
    { name: "行业动态", slug: "industry-news", color: "#3B82F6", sortOrder: 1 },
    { name: "产品资讯", slug: "product-news", color: "#8B5CF6", sortOrder: 2 },
    { name: "公司新闻", slug: "company-news", color: "#10B981", sortOrder: 3 },
    { name: "技术分享", slug: "tech-share", color: "#F59E0B", sortOrder: 4 },
    { name: "产品展示", slug: "product-showcase", color: "#14B8A6", sortOrder: 5 },
  ];

  const createdTags: Record<string, string> = {};

  for (const tagData of tagsData) {
    const existing = await prisma.cmsTag.findUnique({
      where: { slug: tagData.slug },
    });

    if (!existing) {
      const tag = await prisma.cmsTag.create({
        data: tagData,
      });
      createdTags[tag.name] = tag.id;
      console.log(`  ✓ 创建标签: ${tag.name}`);
    } else {
      createdTags[existing.name] = existing.id;
      console.log(`  ⊙ 标签已存在: ${existing.name}`);
    }
  }

  // ==================== 创建文章 ====================
  console.log("\n📰 创建文章...");

  const articlesData = [
    {
      title: "企智通 2024 年度回顾：助力企业数字化转型的关键一年",
      slug: "qzt-2024-annual-review",
      excerpt: "2024年，企智通服务了超过1000家企业客户，帮助他们实现客户关系管理的数字化转型。让我们一起回顾这一年的成就与里程碑。",
      content: `# 企智通 2024 年度回顾

2024年对企智通来说是意义非凡的一年。在这一年里，我们不断优化产品功能，提升用户体验，服务了越来越多的企业客户。

## 主要成就

### 1. 用户规模突破 1000 家
截至2024年底，使用企智通的企业客户已超过1000家，覆盖制造业、服务业、互联网等多个行业。

### 2. 产品功能持续升级
- 新增智能客户分配系统
- 优化了跟进记录管理
- 增强了数据安全保护

### 3. 客户满意度提升
根据年度调研，客户满意度达到了 95% 以上，续费率超过 85%。

## 展望 2025

新的一年，我们将继续投入研发，推出更多创新功能，帮助企业实现更高效的客户关系管理。`,
      coverImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop",
      tagNames: ["公司新闻"],
    },
    {
      title: "CRM 系统选型指南：如何选择适合企业的客户管理系统",
      slug: "crm-selection-guide",
      excerpt: "选择合适的 CRM 系统对企业至关重要。本文将从功能需求、成本预算、扩展性等多个维度，帮助企业做出明智的选型决策。",
      content: `# CRM 系统选型指南

在数字化转型的浪潮中，CRM（客户关系管理）系统已成为企业不可或缺的工具。但面对市场上众多的 CRM 产品，如何选择最适合自己企业的系统呢？

## 明确核心需求

### 1. 业务流程梳理
在选型前，企业首先要梳理清楚自己的客户管理流程，包括：
- 客户获取方式
- 跟进流程规范
- 销售漏斗阶段

### 2. 功能需求清单
基础功能包括：
- 客户信息管理
- 跟进记录
- 任务提醒
- 数据报表

## 评估维度

### 易用性
系统是否直观易懂，员工是否能快速上手？

### 扩展性
能否满足企业未来发展的需求？

### 性价比
不仅要看价格，更要看价值。

## 企智通的优势

企智通专为中国中小企业设计，界面简洁，功能实用，价格透明，是值得信赖的选择。`,
      coverImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=600&fit=crop",
      tagNames: ["行业动态", "技术分享"],
    },
    {
      title: "销售团队管理：如何通过数据分析提升团队业绩",
      slug: "sales-team-data-analysis",
      excerpt: "数据分析是提升销售团队业绩的利器。本文分享如何利用 CRM 系统的数据分析功能，洞察销售瓶颈，优化团队管理。",
      content: `# 销售团队管理：数据分析的价值

在竞争激烈的市场环境中，数据驱动的销售管理已成为企业制胜的关键。

## 数据分析的重要性

### 1. 发现销售瓶颈
通过数据分析，可以识别：
- 转化率低的阶段
- 耗时过长的流程
- 跟进不及时的问题

### 2. 优化资源配置
根据数据分析结果，可以：
- 合理分配客户资源
- 优化销售人员的区域分配
- 调整激励政策

## 关键指标监控

### 转化漏斗分析
从线索到成交的每个环节转化率是多少？

### 客户分配效率
新客户的平均响应时间是多久？

### 销售人员绩效
谁的跟进效果最好？谁需要帮助？

## 企智通的数据分析功能

企智通提供了丰富的数据报表，帮助管理者：
- 实时查看销售漏斗
- 分析客户转化率
- 监控团队绩效
- 预测销售趋势

让数据说话，让决策更明智。`,
      coverImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=600&fit=crop",
      tagNames: ["技术分享"],
    },
  ];

  for (const articleData of articlesData) {
    const existing = await prisma.cmsContent.findUnique({
      where: { slug: articleData.slug },
    });

    if (!existing) {
      const tagIds = articleData.tagNames
        .map((name) => createdTags[name])
        .filter(Boolean);

      const article = await prisma.cmsContent.create({
        data: {
          title: articleData.title,
          slug: articleData.slug,
          excerpt: articleData.excerpt,
          content: articleData.content,
          coverImage: articleData.coverImage,
          contentType: "ARTICLE",
          status: "PUBLISHED",
          authorId: author.id,
          publishedAt: new Date(),
          ...(tagIds.length > 0 && {
            tags: {
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }),
          metaTitle: articleData.title,
          metaDesc: articleData.excerpt,
        },
      });
      console.log(`  ✓ 创建文章: ${article.title}`);
    } else {
      console.log(`  ⊙ 文章已存在: ${existing.title}`);
    }
  }

  // ==================== 创建产品展示 ====================
  console.log("\n🚀 创建产品展示...");

  // 获取现有产品
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    take: 3,
  });

  const productShowcasesData = [
    {
      title: "企智通专业版：为成长型企业量身打造",
      slug: "qzt-professional-edition",
      excerpt: "专业版提供了完整的客户管理功能，包括智能分配、数据分析、权限管理等，适合 20-100 人的成长型企业使用。",
      content: `# 企智通专业版

专为成长型企业设计，提供完整的客户关系管理解决方案。

## 核心功能

### 客户管理
- 360度客户画像
- 客户分级管理
- 客户标签体系

### 销售管理
- 销售漏斗管理
- 跟进任务提醒
- 销售预测分析

### 团队协作
- 角色权限管理
- 团队数据共享
- 协作跟进机制

### 数据分析
- 销售报表
- 转化漏斗分析
- 客户分布分析

## 适用场景

- 20-100 人的企业
- 多人销售团队
- 需要数据化管理

## 价格方案

- 月付：¥299/月
- 年付：¥2,990/年（省 2 个月）

现在注册，享受 30 天免费试用！`,
      coverImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=600&fit=crop",
      tagNames: ["产品展示"],
    },
    {
      title: "企智通企业版：大型企业的数字化解决方案",
      slug: "qzt-enterprise-edition",
      excerpt: "企业版提供高级定制、专属服务、私有化部署等企业级功能，满足大型企业的复杂需求。",
      content: `# 企智通企业版

面向大型企业的企业级客户管理解决方案。

## 企业级特性

### 高级定制
- 自定义字段
- 自定义业务流程
- API 对接支持

### 安全保障
- 数据加密存储
- 操作日志审计
- 私有化部署选项

### 专属服务
- 专属客户经理
- 7×24 小时技术支持
- 定期系统健康检查

### 集成能力
- ERP 系统对接
- 财务系统对接
- 第三方应用集成

## 适用场景

- 100 人以上的企业
- 多部门协作
- 复杂的业务流程

## 联系我们

企业版需要根据企业需求进行定制化方案设计，请联系我们的销售团队获取专属方案。`,
      coverImage: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=600&fit=crop",
      tagNames: ["产品展示", "解决方案"],
    },
  ];

  for (let i = 0; i < productShowcasesData.length; i++) {
    const showcaseData = productShowcasesData[i];
    const existing = await prisma.cmsContent.findUnique({
      where: { slug: showcaseData.slug },
    });

    if (!existing) {
      const tagIds = showcaseData.tagNames
        .map((name) => createdTags[name])
        .filter(Boolean);

      const showcase = await prisma.cmsContent.create({
        data: {
          title: showcaseData.title,
          slug: showcaseData.slug,
          excerpt: showcaseData.excerpt,
          content: showcaseData.content,
          coverImage: showcaseData.coverImage,
          contentType: "PRODUCT_SHOWCASE",
          status: "PUBLISHED",
          authorId: author.id,
          productId: products[i]?.id || null,
          publishedAt: new Date(),
          ...(tagIds.length > 0 && {
            tags: {
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }),
          metaTitle: showcaseData.title,
          metaDesc: showcaseData.excerpt,
        },
      });
      console.log(`  ✓ 创建产品展示: ${showcase.title}`);
    } else {
      console.log(`  ⊙ 产品展示已存在: ${existing.title}`);
    }
  }

  console.log("\n✅ CMS 内容数据填充完成！");
  console.log("\n📊 数据统计：");

  const [articleCount, productCount, tagCount] = await Promise.all([
    prisma.cmsContent.count({ where: { contentType: "ARTICLE" } }),
    prisma.cmsContent.count({ where: { contentType: "PRODUCT_SHOWCASE" } }),
    prisma.cmsTag.count(),
  ]);

  console.log(`  - 文章: ${articleCount} 篇`);
  console.log(`  - 产品展示: ${productCount} 个`);
  console.log(`  - 标签: ${tagCount} 个`);
}

main()
  .catch((e) => {
    console.error("❌ 填充数据失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
