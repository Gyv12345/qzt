// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '企智通',
  tagline: '一站式企业管理平台 · 文档中心',
  favicon: 'img/favicon.ico',

  url: 'https://docs.devlovecode.com',
  baseUrl: '/',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: { respectPrefersColorScheme: true },
      navbar: {
        title: '企智通',
        items: [
          { type: 'docSidebar', sidebarId: 'intro', position: 'left', label: '开始' },
          { type: 'docSidebar', sidebarId: 'architecture', position: 'left', label: '架构' },
          { type: 'docSidebar', sidebarId: 'modules', position: 'left', label: '功能模块' },
          { type: 'docSidebar', sidebarId: 'deployment', position: 'left', label: '部署' },
          { href: 'https://devlovecode.com', label: '官网', position: 'right' },
          { href: 'https://admin.devlovecode.com', label: '后台', position: 'right' },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: '产品',
            items: [
              { label: '官网', href: 'https://devlovecode.com' },
              { label: '后台管理', href: 'https://admin.devlovecode.com' },
              { label: '移动端', href: 'https://m.devlovecode.com' },
            ],
          },
          {
            title: '文档',
            items: [
              { label: '快速开始', to: '/' },
              { label: '架构设计', to: '/architecture/overview' },
              { label: '功能模块', to: '/modules/crm' },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} 企智通 · 河南爱编程网络科技有限公司`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['go', 'bash', 'json', 'yaml', 'tsx'],
      },
    }),
};

export default config;
