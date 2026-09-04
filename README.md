# 企智通 QZT —— 开源一站式企业管理平台

> 一个系统,管好企业的全部业务。**CRM + 审批流 + 进销存 + 财务 + HRM + OA + 项目 + 知识库 + 网盘 + 营销获客 + 商城 + 官网 CMS + AI(MCP)**,13 个业务模块长在同一套数据库上,MIT 协议完全开源,私有化部署,数据 100% 归企业所有。

线上示例:[企智通官网](https://devlovecode.com)(产品介绍 / 在线体验 / 文档)

## 为什么是企智通?

- **一体化,不是拼盘**:签了合同,财务自动生成应收;报销审批一通过,记账凭证自动落账;商城来了订单,进销存自动出库扣库存;抖音广告线索自动进销售公海。业务之间不需要人工"粘合"。
- **开源 + 私有化**:全部源码无保留(MIT),部署在你自己的服务器上,MySQL / Redis 都是常见组件,没有黑盒云服务。
- **AI 原生**:内置 MCP Server,把 300+ 业务操作开放给任意支持 MCP 的 AI 客户端(Claude、Cursor 等),自然语言直接查库存、录客户、走审批。
- **多端形态**:管理后台(PC)+ 企业官网 + 移动端 H5 + 独立商城,一套后端全支持。

## 功能模块

| 模块 | 能力概览 |
| --- | --- |
| CRM 客户管理 | 线索/公海/查重、客户档案与自定义字段、联系人、商机阶段与漏斗、合同模板与审批、回款计划与登记、售后工单、产品与多规格 SKU |
| 审批中心 | 待办/已办/我发起的;按表单类型配置审批流(多级、会签/或签、角色/主管/上级、空审批人兜底) |
| 办公 OA | 可视化自定义表单、报销(审批通过自动记账)、出差、借款、请假、工作日志、日程、会议预订(冲突检测)、公告、站内信(SSE 实时推送) |
| 进销存 PSI | 采购/销售单(审批 + 出入库)、多规格 SKU × 多仓库库存、收发明细、其他出入库(期初/盘盈亏/领用/报废)、供应商、仓库、固定资产、报表 |
| 财务 | 会计科目、记账凭证、发票(自动算税)、应收应付(部分结算)、资产负债表/利润表 |
| 人事 HRM | 部门/岗位/员工档案(履历)、考勤打卡 + 企业微信打卡自动同步、绩效考核(自评 + 评审)、招聘 |
| 项目管理 | 项目关联客户合同,任务看板(负责人/优先级/截止) |
| 知识库 / 网盘 | 分类树 + 文档 + 版本历史;个人/部门/公共三类空间 |
| 营销获客 | 抖音/巨量引擎广告线索自动同步入公海,同步日志逐条留痕 |
| 独立商城 | 免登录下单,商品复用 CRM 产品库,成交自动生成 PSI 销售单并扣库存 |
| 官网 CMS | 文章/分类/单页/标签/首页板块后台可维护;联系表单自动创建 CRM 线索 |
| 系统管理 | 用户/角色/菜单(RBAC + 四档数据权限)、字典、业务编号规则、企业微信扫码登录、操作/登录日志(IP 归属地)、定时任务 |
| AI(MCP) | 内置 MCP Server:300+ 业务工具,API Key 认证、按模块裁剪、操作级鉴权、默认拒绝 |

## 架构

```
                    ┌───────────────┐
                    │ qzt-go-server │  唯一数据源(Go 1.25 + Gin + GORM + Casbin + Redis, :9000)
                    └──────┬────────┘
        ┌─────────┬────────┼─────────┬──────────┐
        │         │        │         │          │
   qzt-go-admin  qzt-go-cms  qzt-go-mobile  qzt-go-mall  qzt-docs
   （管理后台 SPA）（企业官网）  （移动端 H5）  （公开商城）  （文档站）
```

- 后端是**模块化单体**:一个 Go 进程承载全部业务域(路由按模块自动挂载 `/crm`、`/psi`、`/finance`…),所有前端统一走 `/prod-api` 前缀消费 REST API,响应信封 `{code, msg, data, timestamp}`。
- 分层:`Router → Middleware → Handler → Service → Repository → GORM`,跨模块依赖走 contract 接口。
- 认证 JWT + Casbin RBAC;数据权限四档(全部/本部门/本部门及子/仅本人)在列表层自动过滤。

## 快速开始

### 1. 初始化数据库(MySQL 8)

```bash
mysql -u root -p -e "CREATE DATABASE qztgo DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
# 地基表 + 种子数据(必须最先执行),再按需执行同目录模块 SQL
mysql -u root -p qztgo < qzt-go-server/docs/sql/qztgo.sql
```

`docs/sql/` 中 `rbac_test_*`、`fix_*`、`*_remove` 等为回归补丁/历史迁移,新装可跳过,详见该目录 README。

### 2. 启动后端(:9000)

```bash
cd qzt-go-server
cp .env.example .env       # 填入 MySQL DSN / Redis / JWT_SECRET
make run                   # 默认加载 .env 与 config/config.dev.yaml
# Swagger: http://localhost:9000/swagger/index.html
```

默认管理员:`admin / admin123`(登录后请立即修改)。

### 3. 启动管理后台(:5173)

```bash
cd qzt-go-admin
pnpm install && pnpm dev   # dev 代理已把 /prod-api 转发到 localhost:9000
```

### 4. 其它前端(可选)

```bash
cd qzt-go-cms   && npm install && npm run dev    # 官网 :3000
cd qzt-go-mobile && pnpm install && pnpm dev     # 移动端 H5 :5174
cd qzt-go-mall  && pnpm install && pnpm dev      # 公开商城 :5175
```

生产部署参考各子项目 README 与 `docs/sql/README.md`(后端交叉编译 + systemd,前端静态托管 / Next.js 独立进程)。

## AI 接入(MCP)

后端内置 MCP Server(Streamable HTTP,挂载 `/mcp`),把 CRM/进销存/财务/人事/OA 等模块的 300+ 业务操作封装为标准 MCP 工具:

- 在管理后台「个人中心 → API Key」生成密钥(`qzt_` 前缀),按模块裁剪工具集;
- 在任意支持 MCP 的客户端(Claude Desktop、Cursor、自建 Agent…)配置该地址与密钥即可;
- 每次工具调用都经过操作级权限映射 + Casbin 鉴权,未授权操作默认拒绝,全量审计。

效果:对 AI 说「帮我看看本月回款和库存预警」「新建一个客户,联系人王总」「提交一条请假」——它直接操作你的企智通。

## 目录结构

```
qzt-go-server/   Go 后端(API/MCP/定时任务/文档与建表 SQL)
qzt-go-admin/    管理后台(React 19 + antd 5 + ProComponents)
qzt-go-cms/      企业官网(Next.js 15)
qzt-go-mobile/   移动端 H5(React 19 + antd-mobile)
qzt-go-mall/     独立公开商城(React 19 + antd-mobile)
qzt-docs/        文档站(Docusaurus)
docs/            产品/架构文档
```

> iOS / Android 原生客户端未包含在本开源仓库中。

## 文档

- 后端架构与编码规范:`qzt-go-server/docs/`(ARCHITECTURE / CODING / PRD)
- 各子项目 README(构建、配置、联调约定)
- 接口文档:后端启动后访问 `/swagger/index.html`
- 在线文档站源码:`qzt-docs/`

## 商务服务

| 项目 | 费用 | 说明 |
| --- | --- | --- |
| 自部署 | **免费** | 开源协议允许任意使用,照本 README 部署即可 |
| 交钥匙部署 | **500 元(一次性)** | 部署到你的服务器:环境搭建、上线、基础使用培训 |
| 二次开发 | 500 元/天(5 天内) | 新功能、流程改造、第三方对接;超过 5 天 300 元/天 |

- 官网:[devlovecode.com](https://devlovecode.com)(在线体验 / 需求留言)
- 电话:15139960649(史晨阳)
- 邮箱:shichenyang@devlovecode.com
- 河南爱编程网络科技有限公司 · 河南洛阳

## License

[MIT](LICENSE) © 2026 河南爱编程网络科技有限公司
