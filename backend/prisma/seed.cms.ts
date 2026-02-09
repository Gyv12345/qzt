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
    { name: "成功案例", slug: "success-case", color: "#EF4444", sortOrder: 5 },
    { name: "解决方案", slug: "solution", color: "#6366F1", sortOrder: 6 },
    { name: "团队介绍", slug: "team-intro", color: "#EC4899", sortOrder: 7 },
    { name: "产品展示", slug: "product-showcase", color: "#14B8A6", sortOrder: 8 },
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
      tagNames: ["技术分享", "解决方案"],
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

  // ==================== 创建案例 ====================
  console.log("\n💼 创建案例...");

  const casesData = [
    {
      title: "某制造企业：客户跟进效率提升 200%",
      slug: "manufacturing-crm-case",
      excerpt: "该企业通过使用企智通，实现了客户信息的集中管理，跟进响应时间从平均 2 天缩短到 4 小时，成单率提升 35%。",
      content: `# 某制造企业：客户跟进效率提升 200%

## 项目背景

该企业是一家专业的机械制造企业，拥有 50 多人的销售团队，服务全国各地的客户。在引入企智通之前，面临以下问题：

## 痛点分析

### 1. 客户信息分散
客户资料保存在销售人员的 Excel 表格和个人电脑中，信息不共享，易丢失。

### 2. 跟进效率低下
缺乏统一的跟进记录系统，管理者无法了解跟进进度，客户跟进不及时。

### 3. 数据统计分析困难
无法准确统计销售漏斗、转化率等关键指标，管理决策缺乏数据支撑。

## 解决方案

### 1. 统一客户管理
将所有客户信息录入系统，实现数据的集中存储和权限管理。

### 2. 标准化跟进流程
建立标准化的跟进流程，销售人员每次跟进后及时记录。

### 3. 数据驱动决策
通过系统报表，管理者可以实时查看销售数据，做出科学决策。

## 实施效果

### 效率提升
- 客户响应时间：从 2 天缩短到 4 小时
- 跟进效率：提升 200%

### 业绩增长
- 成单率：提升 35%
- 客户满意度：提升 28%

## 客户评价

> "企智通帮助我们实现了销售管理的数字化转型，系统稳定易用，服务响应及时。"
> —— 销售总监`,
      coverImage: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=600&fit=crop",
      tagNames: ["成功案例"],
    },
    {
      title: "某互联网公司：从线索到成交的全流程优化",
      slug: "internet-company-full-funnel",
      excerpt: "通过企智通的全流程管理，该公司实现了从线索获取到成交的完整闭环，线索转化率从 15% 提升到 32%。",
      content: `# 某互联网公司：全流程优化实践

## 项目背景

该公司是一家提供企业级 SaaS 服务的互联网公司，拥有多个营销渠道，但线索转化率一直不理想。

## 核心挑战

### 1. 多渠道线索整合困难
来自不同渠道的线索分散管理，缺乏统一的处理流程。

### 2. 线索流转不透明
线索从市场部到销售部的流转缺乏透明度，容易造成线索浪费。

### 3. 转化率无法追踪
无法准确统计各渠道的转化效果，营销投入缺乏数据依据。

## 解决方案

### 1. 统一线索管理
建立统一的线索池，所有渠道的线索集中管理。

### 2. 智能分配机制
根据销售人员的专长、工作量等因素，智能分配线索。

### 3. 全流程追踪
从线索获取到成交的每个环节都有记录，形成完整的转化漏斗。

## 实施成果

### 转化率提升
- 整体转化率：从 15% 提升到 32%
- 线索响应速度：提升 80%

### 营销效率优化
- 高效渠道识别：精准识别高效渠道
- 营销 ROI：提升 45%

## 经验总结

1. **数据先行**：建立统一的数据标准是流程优化的基础
2. **工具支撑**：选择合适的 CRM 系统至关重要
3. **持续优化**：根据数据反馈持续优化流程`,
      coverImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop",
      tagNames: ["成功案例", "解决方案"],
    },
  ];

  for (const caseData of casesData) {
    const existing = await prisma.cmsContent.findUnique({
      where: { slug: caseData.slug },
    });

    if (!existing) {
      const tagIds = caseData.tagNames
        .map((name) => createdTags[name])
        .filter(Boolean);

      const caseStudy = await prisma.cmsContent.create({
        data: {
          title: caseData.title,
          slug: caseData.slug,
          excerpt: caseData.excerpt,
          content: caseData.content,
          coverImage: caseData.coverImage,
          contentType: "CASE_STUDY",
          status: "PUBLISHED",
          authorId: author.id,
          publishedAt: new Date(),
          ...(tagIds.length > 0 && {
            tags: {
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }),
          metaTitle: caseData.title,
          metaDesc: caseData.excerpt,
        },
      });
      console.log(`  ✓ 创建案例: ${caseStudy.title}`);
    } else {
      console.log(`  ⊙ 案例已存在: ${existing.title}`);
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
      tagNames: ["产品展示", "解决方案"],
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

  // ==================== 创建人员介绍 ====================
  console.log("\n👥 创建人员介绍...");

  // 获取现有用户
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    take: 5,
  });

  const profilesData = [
    {
      title: "张明 - 产品总监",
      slug: "zhangming-product-director",
      excerpt: "10 年企业服务产品经验，曾主导多款企业级产品的设计与研发。",
      content: `# 张明
## 产品总监

张明拥有 10 年的企业服务产品设计经验，擅长将复杂的业务需求转化为简洁易用的产品功能。

## 专业背景

- 曾任职于多家知名 SaaS 企业
- 主导过千万级用户产品的设计
- 拥有产品设计专利 3 项

## 工作理念

> "好的产品应该让用户忘记它的存在，却能感受到效率的提升。"

## 主要职责

- 负责企智通产品规划
- 主导用户体验设计
- 推动产品创新迭代`,
      coverImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
      tagNames: ["团队介绍"],
    },
    {
      title: "李婷 - 技术负责人",
      slug: "liting-tech-lead",
      excerpt: "12 年软件开发经验，精通分布式系统架构，负责企智通的技术架构设计与研发管理。",
      content: `# 李婷
## 技术负责人

李婷是一位资深的技术专家，在企业级软件开发领域深耕 12 年。

## 技术专长

- 分布式系统架构设计
- 高并发系统优化
- 数据库设计与优化
- 微服务架构实践

## 项目经验

- 曾主导千万级用户系统的架构设计
- 拥有多项技术发明专利
- 开源项目贡献者

## 技术理念

> "代码质量是产品的生命线，技术架构决定了产品的发展上限。"

## 主要职责

- 负责技术架构设计
- 主导核心技术研发
- 推动技术团队成长`,
      coverImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      tagNames: ["团队介绍"],
    },
    {
      title: "王强 - 销售总监",
      slug: "wangqiang-sales-director",
      excerpt: "15 年 B2B 销售经验，擅长企业客户开发与团队管理。",
      content: `# 王强
## 销售总监

王强在企业服务销售领域拥有丰富的经验，帮助众多企业实现数字化转型。

## 销售业绩

- 累计服务企业客户 500+
- 带领团队实现业绩连续 3 年翻倍
- 客户续约率保持在 90% 以上

## 行业洞察

王强深刻理解各行业的客户管理痛点，能够为客户提供专业的咨询建议。

## 服务理念

> "我们不只是销售产品，更是为企业提供解决问题的方案。"

## 主要职责

- 负责销售团队管理
- 大客户开发与维护
- 销售策略制定与执行`,
      coverImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      tagNames: ["团队介绍"],
    },
  ];

  for (let i = 0; i < profilesData.length; i++) {
    const profileData = profilesData[i];
    const existing = await prisma.cmsContent.findUnique({
      where: { slug: profileData.slug },
    });

    if (!existing) {
      const tagIds = profileData.tagNames
        .map((name) => createdTags[name])
        .filter(Boolean);

      const profile = await prisma.cmsContent.create({
        data: {
          title: profileData.title,
          slug: profileData.slug,
          excerpt: profileData.excerpt,
          content: profileData.content,
          coverImage: profileData.coverImage,
          contentType: "PROFILE",
          status: "PUBLISHED",
          authorId: author.id,
          userId: users[i]?.id || null,
          publishedAt: new Date(),
          ...(tagIds.length > 0 && {
            tags: {
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }),
          metaTitle: profileData.title,
          metaDesc: profileData.excerpt,
        },
      });
      console.log(`  ✓ 创建人员介绍: ${profile.title}`);
    } else {
      console.log(`  ⊙ 人员介绍已存在: ${existing.title}`);
    }
  }

  console.log("\n✅ CMS 内容数据填充完成！");
  console.log("\n📊 数据统计：");

  const [articleCount, caseCount, productCount, profileCount, tagCount] =
    await Promise.all([
      prisma.cmsContent.count({ where: { contentType: "ARTICLE" } }),
      prisma.cmsContent.count({ where: { contentType: "CASE_STUDY" } }),
      prisma.cmsContent.count({ where: { contentType: "PRODUCT_SHOWCASE" } }),
      prisma.cmsContent.count({ where: { contentType: "PROFILE" } }),
      prisma.cmsTag.count(),
    ]);

  console.log(`  - 文章: ${articleCount} 篇`);
  console.log(`  - 案例: ${caseCount} 个`);
  console.log(`  - 产品展示: ${productCount} 个`);
  console.log(`  - 人员介绍: ${profileCount} 个`);
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
