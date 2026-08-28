# qzt-go-cms

企智通企业官网（公开站）——产品 / 团队 / 合作伙伴 / 新闻动态 / 联系表单，内容与营销文案来自 qzt-go-server 的 `cms` 模块，由 admin 后台维护。

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Next.js 15（App Router）+ React 19 + TypeScript |
| 样式 | Tailwind CSS 3（语义化 class，双主题包切换：默认深色科技风） |
| 内容 | react-markdown + remark-gfm 渲染后端富文本/Markdown |
| 包管理 | npm，dev 端口 **3000** |

## 快速开始

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # next build
npm run lint    # next lint
```

后端地址由 `.env.local` 的 `NEXT_PUBLIC_API_BASE` 决定（构建期内联）。**注意**：本机 `.env.local` 若写着 `http://localhost:8000` 是历史遗留，实际后端跑在 **9000**，联调前先改。服务器上 `.env.local` 为 `http://127.0.0.1:9000`（rsync 部署时必须 `--exclude .env*`，勿覆盖）。

## 页面路由

| 路径 | 说明 |
| --- | --- |
| `/` | 首页——模块墙（`cms_homepage_module` + `cms_homepage_feature` 配置驱动）+ 营销文案（site-config） |
| `/products` `/partners` `/team` | 产品 / 合作伙伴 / 团队（团队仅公开展示「精选」成员） |
| `/news` `/p/[slug]` | 新闻列表 / 文章详情（`/cms/public/articles` 免鉴权接口） |
| `/about` `/contact` | 关于我们 / 联系表单（提交走 `src/app/api/contact` 代理，落库为 CRM 线索进公海并推送管理员） |
| `/md/*`、`/llms.txt`、`/llms-full.txt` | 全站 Markdown 输出（LLM 友好），见 `src/app/md/` 与 `src/lib/markdown.ts` |
| `robots.ts` / `sitemap.ts` | SEO |

数据获取统一走 `src/lib/api.ts`；站点常量（名称/域名/导航）在 `src/lib/site.ts`，可被 `NEXT_PUBLIC_SITE_NAME` / `NEXT_PUBLIC_SITE_URL` 覆盖。

## 已知行为

- **首页配置有 ISR 缓存（5 分钟）**：admin 后台改完首页模块/营销内容，官网最长延迟 5 分钟生效、可能要刷两次——不是 bug。
- 主题与营销内容配置化：主题包 + `sys_site_config`（site-config）驱动，admin「内容管理」里维护；本站不写死任何文案域名。

## 部署（Next.js 需在服务器构建）

```bash
# 本地 rsync 源码（排除 node_modules/.next/.git/.env*）
rsync -az --delete --exclude node_modules --exclude .next --exclude .git --exclude '._*' \
  -e "ssh -i <pem>" ./ root@<server>:/opt/qzt-cms/

# 服务器上构建 + 重启（pm2 托管 next start -p 3000）
ssh -i <pem> root@<server> "cd /opt/qzt-cms && npm install --omit=dev && npx next build && pm2 restart qzt-cms"
```

> 坑：误覆盖服务器 `.env.local` 会导致 build 期 API base 被内联成错误地址、页面取不到数据。修复：补回正确 `.env.local` 后 `rm -rf .next && npx next build`。

## 许可与商业服务

版权归 **河南爱编程网络科技有限公司** 所有，基于 [MIT 协议](../LICENSE) 开源——自行部署、使用、修改完全免费。

- **官方部署服务**（由我们代为部署上线）：**500 元 / 次**
- **二次开发 / 定制**：面谈

详见[工作区 README](../README.md)「版权与商业服务」。

