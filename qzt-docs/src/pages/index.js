import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const features = [
  { title: 'CRM 客户管理', icon: '🎯', desc: '线索 → 客户 → 商机 → 合同 → 回款，完整销售漏斗，公海池、团队协作、跟进管理' },
  { title: '审批流程中心', icon: '✅', desc: '可视化拖拽流程设计器，条件分支、会签加签、审批通过自动更新业务状态' },
  { title: 'PSI 进销存', icon: '📦', desc: '采购、销售、库存、供应商、仓库，出入库流水实时联动' },
  { title: '财务管理', icon: '💰', desc: '会计科目、记账凭证、发票管理，回款自动生成财务凭证' },
  { title: 'HRM 人事管理', icon: '👥', desc: '组织架构、员工全生命周期、考勤薪资、离职一键交接' },
  { title: 'AI 业务系统', icon: '🤖', desc: '全模块 333 个功能 MCP 开放，Claude / Cursor 等 AI 客户端连上即可用自然语言操作系统' },
  { title: 'CMS 内容管理', icon: '📝', desc: 'Markdown富文本编辑、分类标签管理、一键同步企业官网' },
  { title: '数据分析', icon: '📊', desc: 'CRM/HRM/财务/进销存多维度BI仪表盘，ECharts可视化' },
];

const techStack = [
  { label: 'Go 1.25', color: '#00ADD8' },
  { label: 'React 19', color: '#61DAFB' },
  { label: 'TypeScript', color: '#3178C6' },
  { label: 'Next.js 15', color: '#000000' },
  { label: 'antd 5', color: '#1677FF' },
  { label: 'MySQL', color: '#4479A1' },
  { label: 'Redis', color: '#DC382D' },
  { label: 'Casbin', color: '#3B6CFF' },
];

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      <div className="container">
        <div className={styles.badge}>开源 · 私有部署 · AI 原生</div>
        <Heading as="h1" className={styles.heroTitle}>
          {siteConfig.title}
        </Heading>
        <p className={styles.heroSubtitle}>
          一站式企业管理平台
        </p>
        <p className={styles.heroDesc}>
          CRM · 审批 · 进销存 · 财务 · HRM · CMS · AI<br/>
          10个模块 50+功能，一个系统替代多个SaaS
        </p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/intro">
            📖 快速开始
          </Link>
          <Link className="button button--secondary button--lg" to="/modules/crm">
            🎯 功能模块
          </Link>
          <a className="button button--outline button--lg" href="https://admin.devlovecode.com" target="_blank">
            🚀 在线体验
          </a>
        </div>
        <div className={styles.techStack}>
          {techStack.map((t) => (
            <span key={t.label} className={styles.techBadge} style={{ borderColor: t.color }}>
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDesc}>{desc}</p>
    </div>
  );
}

export default function Home() {
  return (
    <Layout title="企智通 · 一站式企业管理平台" description="CRM、审批、进销存、财务、HRM、AI一体化管理平台">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: '企智通',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          description: '一站式企业管理平台,包含CRM客户管理、审批流程、进销存、财务、HRM、CMS、AI助手等模块',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
          publisher: {
            '@type': 'Organization',
            name: '河南爱编程网络科技有限公司',
            url: 'https://devlovecode.com',
          },
        })}} />
      </head>
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <h2 className={styles.sectionTitle}>核心功能模块</h2>
            <div className={styles.featureGrid}>
              {features.map((f) => (
                <Feature key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>
        <section className={styles.pricingSection}>
          <div className="container">
            <h2 className={styles.sectionTitle}>收费模式</h2>
            <p className={styles.pricingSubtitle}>软件完全免费，只收一次性部署服务费</p>
            <div className={styles.pricingGrid}>
              <div className={styles.pricingCard}>
                <div className={styles.pricingIcon}>💡</div>
                <h3 className={styles.pricingTitle}>软件免费</h3>
                <div className={styles.pricingPrice}>¥0</div>
                <p className={styles.pricingDesc}>
                  源代码开放，无授权费、无按人头收费、无年费。<br/>
                  你可以自己部署，完全不花钱。
                </p>
                <ul className={styles.pricingList}>
                  <li>✅ 全部功能模块（CRM/审批/进销存/财务/HRM/AI）</li>
                  <li>✅ 不限用户数、不限数据量</li>
                  <li>✅ 数据 100% 存你自己的服务器</li>
                  <li>✅ 可二次开发、可改品牌</li>
                </ul>
              </div>
              <div className={styles.pricingCard + ' ' + styles.pricingCardHighlight}>
                <div className={styles.pricingBadge}>推荐</div>
                <div className={styles.pricingIcon}>🚀</div>
                <h3 className={styles.pricingTitle}>部署服务</h3>
                <div className={styles.pricingPrice}>¥500<span className={styles.pricingUnit}> / 次</span></div>
                <p className={styles.pricingDesc}>
                  不想自己折腾？我们帮你部署上线，当天可用。<br/>
                  一次付费，永久使用，后续无任何费用。
                </p>
                <ul className={styles.pricingList}>
                  <li>✅ 服务器环境搭建 + 全套系统部署</li>
                  <li>✅ HTTPS 证书配置 + 域名绑定</li>
                  <li>✅ 数据库初始化 + 种子数据</li>
                  <li>✅ 使用培训 + 技术文档</li>
                  <li>✅ 部署后 7 天技术支持</li>
                </ul>
              </div>
              <div className={styles.pricingCard}>
                <div className={styles.pricingIcon}>🛠️</div>
                <h3 className={styles.pricingTitle}>定制开发</h3>
                <div className={styles.pricingPrice}>按需报价</div>
                <p className={styles.pricingDesc}>
                  需要特殊功能？基于现有架构二次开发。<br/>
                  报价透明，工期明确，源码交付。
                </p>
                <ul className={styles.pricingList}>
                  <li>✅ 业务流程定制</li>
                  <li>✅ 界面品牌定制</li>
                  <li>✅ 第三方系统对接</li>
                  <li>✅ 源码交付 + 部署</li>
                </ul>
              </div>
            </div>
            <p className={styles.pricingNote}>
              💬 不管选哪种，软件本身都是免费的。部署费只是人工服务费，不是软件授权费。
            </p>
          </div>
        </section>
        <section className={styles.ctaSection}>
          <div className="container">
            <h2 className={styles.ctaTitle}>开始使用企智通</h2>
            <p className={styles.ctaDesc}>软件免费 · 一次部署 · 数据私有</p>
            <div className={styles.buttons}>
              <Link className="button button--primary button--lg" to="/deployment/overview">
                部署指南
              </Link>
              <Link className="button button--secondary button--lg" to="/architecture/overview">
                架构设计
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
