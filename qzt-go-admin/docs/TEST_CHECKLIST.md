# qzt-go-admin 全量回归测试清单

> 适用项目：`qzt-go-admin`(Vite 7 + React 19 + TS + antd 5 / ProComponents + Zustand)
> 性质：**人工黑盒回归测试清单**(admin 无测试框架,质量关口为 `pnpm build` 的 tsc 类型检查)。
> 维护约定:新增页面/模块时,必须在本清单对应章节补上用例;重命名/删除页面时同步删除对应用例。

---

## 0. 测试前置说明

### 0.1 环境

| 环境 | 地址 | 后端 |
| --- | --- | --- |
| 本地 dev | `http://localhost:5173`(Vite 代理 `/prod-api` → `localhost:9000`) | `make run` 起的 dev server |
| 生产 | `https://admin.devlovecode.com`(`/prod-api` → `127.0.0.1:9000`) | systemd `qzt-server` |

- 前端 API 统一前缀 `/prod-api`;浏览器页面路由与后端接口前缀刻意相同,靠 `Accept` 头区分(SPA fallback vs 代理)。
- 后端响应信封 `{code, msg, data, timestamp}`,`code===0` 成功;axios 拦截器已自动解包,service 直接返回 `data`。

### 0.2 测试账号

| 账号 | 密码 | 用途 |
| --- | --- | --- |
| `admin` / `shijie123` | 生产超管(super_admin,绕过 RBAC) | 全量功能验证 |
| 普通用户(自建) | 自定 | 验证菜单可见性、按钮权限、数据权限 |
| 本部/跨部用户各一名 | 自定 | 验证 `data_scope` 数据范围 |

> 登录连续错误 5 次锁 15 分钟(Redis key),解锁需 redis-cli `DEL`;测试不要反复试错触发锁定。

### 0.3 约定

- 用例标记:`[ ]` 未测 / `[x]` 通过;模块章节按 **列表/查询 → 新增 → 编辑 → 删除 → 详情 → 模块业务流 → 边界与权限** 组织。
- "通用项"(第 2 章)适用所有 CRUD 页,逐页测试时先过通用项再过模块专项,避免重复。
- 所有"按钮权限"用例:需用 **非 super_admin 账号** 验证(super_admin 绕过 RBAC,看不出差异)。

---

## 1. 冒烟入口(优先跑通)

- [ ] `pnpm build` 通过(tsc 类型检查 + vite build 无报错)
- [ ] 本地 `pnpm dev` 启动,`/login` 正常渲染(logo/企业名取自站点配置)
- [ ] 超管登录成功 → 跳 `/dashboard`,工作台各统计区独立加载、无白屏
- [ ] 左侧三级菜单(模块切换 → 一级 → 二级)全部可点开,无 404
- [ ] 任一列表页(如 CRM 客户)能拉到数据、能新增、能编辑、能删除、能看详情
- [ ] 右上角消息铃铛 SSE 实时收到一条通知
- [ ] 退出登录 → 回 `/login`,token 清空

---

## 2. 通用验证项(每个 CRUD 页都要过)

> 以下用例对**每个**列表/表单页复用。逐模块测试时按此清单逐条勾选。

### 2.1 列表与查询

- [ ] 首屏自动加载数据,ProTable 展示 loading → 数据
- [ ] 首列序号(indexBorder)、列宽固定、`scroll.x` 横向滚动正常
- [ ] 操作列固定在右侧,随滚动保持可见
- [ ] 顶部搜索区字段(filters 用 `hideInTable` 列)输入后点查询生效、点重置清空
- [ ] 分页:切页码、切每页条数、总条数与实际一致
- [ ] 空数据:无数据时显示"暂无数据"而非报错
- [ ] 网络断开/接口 500:显示错误提示,不白屏(ErrorBoundary 兜底)

### 2.2 新增(ModalForm / DrawerForm)

- [ ] 点"新增"打开表单,必填项校验提示正确
- [ ] 提交成功 → 关闭表单 + `actionRef.reload()` 刷新列表 + success message
- [ ] 提交失败 → 表单不关闭、保留输入、显示错误
- [ ] 布尔/枚举字段正确转为后端期望值(bool → 0/1、select → value)
- [ ] 两栏布局(`GField`/`colProps`)正确,未挤成单列
- [ ] 取消/关闭表单不触发提交

### 2.3 编辑

- [ ] 点行内"编辑",表单回填现有值(含 select/日期/开关/富文本)
- [ ] 修改后提交成功,列表对应行更新
- [ ] 未改动直接提交不报错(半增量字段留空保留原值)
- [ ] 并发:他人已删该行时编辑提交有友好提示

### 2.4 删除

- [ ] 删除二次确认(antd `Modal.confirm`)
- [ ] 删除成功 → 列表刷新 + 该行消失
- [ ] 被引用记录(如删有客户的联系人/有合同的客户)被后端拒绝时前端有错误提示

### 2.5 详情(Drawer)

- [ ] 点"详情"打开抽屉,展示完整字段
- [ ] 关联 Tab/面板(联系人、合同、跟进、商机等)能加载子数据
- [ ] 抽屉内可触发编辑/审批等操作并刷新

### 2.6 权限(非超管账号)

- [ ] 该页菜单对无权限角色**不可见**(菜单 type=1 + `sys_role_menu` 授权)
- [ ] 直敲 URL 访问被拦(403 或跳转)
- [ ] 无权限的按钮(`Auth perm=...`)不渲染(新增/编辑/删除/导出等分别校验)

### 2.7 数据权限(按角色 data_scope)

- [ ] `data_scope=1`(全部)能看到所有数据
- [ ] `data_scope=3`(本部门)只看到本部门数据
- [ ] `data_scope=4`(本部门及子部门)含子部门
- [ ] `data_scope=5`(仅本人)只看到自己负责的

---

## 3. 登录 / 鉴权 / 个人中心

### 3.1 登录

- [ ] 正确账号密码登录成功,跳 `/`,token 存 `localStorage['qzt-go-admin:tokens']`
- [ ] 错误密码:提示"用户名或密码错误"
- [ ] 连续 5 次错误 → 锁定提示"还可尝试 N 次"/"已锁定",15 分钟后恢复
- [ ] 空用户名/空密码前端校验拦截
- [ ] 登录页 logo/企业名取自站点配置接口(无配置时回退默认)

### 3.2 Token 刷新与 401

- [ ] accessToken 过期:并发多个请求只触发一次 refresh(single-flight),成功后原请求自动重放
- [ ] refreshToken 也过期:提示"登录已过期" → 清凭据 → 跳 `/login`
- [ ] 登录/刷新接口自身 401 不递归刷新(直接走登录页)
- [ ] 403 接口提示"没有操作权限"

### 3.3 退出与会话

- [ ] 退出登录清空 token 与用户信息,回 `/login`
- [ ] 改密码后旧 token 失效,其他会话被踢
- [ ] 深链(刷新页面/直敲 URL)能恢复登录态并回到目标页

### 3.4 个人中心(`/profile`)

- [ ] 基本信息修改(昵称/手机/邮箱)保存成功并实时更新右上角头像区
- [ ] 修改密码:旧密码校验、新密码强度、提交后需重新登录
- [ ] 企业微信绑定/解绑流程(含跨设备扫码绑定页 `/auth/wecom/bind`)
- [ ] API Key:创建(明文只显示一次)、停用、删除

### 3.5 第三方登录

- [ ] 企业微信扫码登录(如已配置):扫码 → 回调 → 自动登录/绑定
- [ ] OAuth 配置在 `system/oauth` 维护

---

## 4. 路由 / 菜单 / 布局

- [ ] 菜单由后端 `/system/menus/user` 驱动,前端无手写路由
- [ ] `type=0` 目录 / `type=1` 菜单 / `type=2` 按钮 三级正确渲染
- [ ] 页面组件路径与后端菜单 `component` 字段一一对应(新增页面必须匹配)
- [ ] 懒加载:切换模块按需加载 chunk(Dashboard/echarts 单独 chunk)
- [ ] 无权限菜单不渲染;死链菜单不显示(`menuHasPath`)
- [ ] 404 页面(`/error/404`)对未知路由正确显示
- [ ] 用户信息加载失败显示重试入口
- [ ] 三级布局:顶部模块切换下拉 → 左侧一级 → 二级分组/叶子 → 内容
- [ ] 业务模块与"后台设置"模块分组正确
- [ ] 布局设置:主题色/暗黑/紧凑/色弱切换即时生效且持久化(settings store)
- [ ] ErrorBoundary:子页面抛错不影响整体布局

---

## 5. 全局通知与消息(SSE)

- [ ] SSE 流(`/prod-api/oa/messages/stream`)建立,Bearer 头正确,断线 5 秒自动重连
- [ ] 右上角铃铛未读数实时更新
- [ ] 前台收到通知:antd Notification 弹出;后台收到:OS 系统通知
- [ ] 点通知跳转到对应业务页
- [ ] 站内信收件箱/发件箱分页、标记已读(单条/全部)、详情查看
- [ ] 发送站内信(选接收人/标题/内容)成功,接收方收到

---

## 6. 后台设置(system)

### 6.1 用户 `system/user`

- [ ] 左侧部门树 + 右侧用户表联动(点部门过滤用户)
- [ ] 新增用户(用户名/密码/角色/手机/邮箱),密码强度校验
- [ ] 编辑用户、停用/启用(`status`)
- [ ] 分配角色(多角色)、重置密码
- [ ] 删除用户(软删)、搜索用户名/昵称

### 6.2 角色 `system/role`

- [ ] 新增角色(code 唯一)、编辑、删除(有用户时拒绝)
- [ ] 菜单权限分配(`system_role_assign_menus`,覆盖式)保存后该角色用户菜单变化
- [ ] API 权限分配(`system_role_assign_apis`,Casbin 覆盖式)生效
- [ ] `data_scope` 数据范围设置生效(到对应业务页验证)

### 6.3 菜单 `system/menu`

- [ ] 菜单树展示(目录/菜单/按钮),新增各级菜单
- [ ] `component` 路径、`path`、`permission`、`icon`、`sort` 正确
- [ ] 删除菜单(有子项时拒绝)、启停用
- [ ] 新增菜单后前端需重新登录/刷新菜单才可见

### 6.4 API `system/api`

- [ ] API 注册列表、新增(path/method/group)、删除
- [ ] 与角色 API 权限配合验证

### 6.5 字典 `system/dict`

- [ ] 新增字典(code 唯一)+ 字典项、编辑、删除
- [ ] 字典变更后前端 `DictSelect`/`DictTag` 取到新值(注意前端字典缓存,需刷新)

### 6.6 系统配置 `system/config`

- [ ] key-value 配置增删改查、缓存刷新接口生效

### 6.7 站点 `system/site`

- [ ] 站点名/logo/favicon/联系方式/备案号/SEO/首页 Hero 保存成功

### 6.8 工作台模块配置 `system/homepage-config`

- [ ] 模块开关(SelectModal 选择展示项)保存后工作台对应区块显隐

### 6.9 自动编号 `system/number`

- [ ] 各模块前缀/日期格式/序号位宽配置保存,新增业务单据时编号按规则生成(用户手填优先于自动)

### 6.10 日志

- [ ] 登录日志 `system/loginlog`:IP/归属地/浏览器/时间/状态筛选与查看
- [ ] 操作日志 `system/operlog`:按模块/人/时间筛选,敏感字段已脱敏

### 6.11 危险操作 `system/reset`

- [ ] 业务数据清空:需输入确认串;**仅在测试库验证**,确认二次弹窗与执行结果

### 6.12 其他配置页

- [ ] OAuth 登录配置 `system/oauth`
- [ ] AI 全局配置 `system/ai-config`、AI 智能体 `system/ai-agent`

---

## 7. CRM(客户关系)

### 7.1 客户 `crm/customer`

- [ ] 列表/搜索/分页/数据权限过滤
- [ ] 新增客户(名称/级别 A/B/C/来源/行业/自定义字段),查重提示(同名/同电话跨线索+客户)
- [ ] 详情抽屉 Tab:联系人 / 合同 / 跟进 / 商机 / 团队 / 负责人变更 / 修改日志 / 自定义字段 / 附件
- [ ] 转移负责人、释放到公海、公海领取
- [ ] 团队协作成员(只读/协作)增删
- [ ] 导入 Excel(下载模板 + 上传 + 逐行错误报告)、导出 CSV/Excel

### 7.2 客户公海 `crm/customer-sea` / 池配置 `crm/pool`

- [ ] 选公海池 + 列表 + 领取
- [ ] 池配置:领取规则/回收规则/容量上限/默认池不可删
- [ ] `pool_filter` PUBLIC/PRIVATE 筛选生效

### 7.3 线索 `crm/lead` 与公海 `crm/lead-sea`/`crm/lead-pool`

- [ ] 线索 CRUD、领取/释放/转移、**转化为客户**
- [ ] 线索公海池配置/规则

### 7.4 商机 `crm/opportunity`

- [ ] 商机 CRUD、看板视图(Kanban)拖拽改阶段(`change_stage` 记录阶段历史)
- [ ] 阶段:PROSPECTING/QUALIFIED/PROPOSAL/NEGOTIATION/WON/LOST 流转
- [ ] 详情抽屉、关联客户

### 7.5 合同 `crm/contract`(重灾区)

- [ ] 合同 CRUD(DRAFT 默认)、金额/起止日期/客户/商机关联
- [ ] 合同模板 + 变量占位(`${...}`)、按模板生成合同文档/打印
- [ ] 回款计划增删改、回款记录登记(自动累计已回款、关联计划同步状态)、回款汇总
- [ ] 合同明细行(items)
- [ ] **发起审批**(form_type=CONTRACT):`ApprovalFlowSetup` 开关 + 设计器入口
- [ ] **e签宝电子签署**:发起签署(initiateEsign)、补签署方、查询签署状态(getEsignStatus)
- [ ] 合同模板 `crm/contract-template` 管理 + 变量清单

### 7.6 其他 CRM

- [ ] 联系人 `crm/contact`(全局,关键决策人标记、关联客户)
- [ ] 跟进 `crm/follow`:跟进计划(待办)+ 跟进记录时间线,提醒时间
- [ ] 产品 `crm/product`(标准价/成本价/上下架)
- [ ] 售后工单 `crm/ticket`(优先级/状态流转/处理日志)
- [ ] 自定义字段 `crm/field`(各 form_key 定义,在客户表单渲染)
- [ ] 阶段配置 `crm/stage`、CRM 设置 `crm/setting`

---

## 8. 审批(approval)

### 8.1 流程设计 `approval/flow`

- [ ] 流程列表(按 form_type,预设流程 enable=0 且不可删)
- [ ] 设计器(@xyflow 节点图):START/APPROVAL/CONDITION/END 节点
- [ ] 审批人配置:类型(USER/ROLE/DEPT_LEADER/UPPER)、串行/并行、多人模式(ALL/ANY)、空审批人/相同提交人处理
- [ ] 节点连线、条件分支、保存版本、启用/停用
- [ ] 按 form_type 自动建流程

### 8.2 审批办理

- [ ] 待办 `approval/todo`:审批通过 / 驳回(任一驳回整实例驳回)/ 转交
- [ ] 已处理 `approval/done`、我发起 `approval/mine`
- [ ] 撤回(仅提交人、仅审批中)、实例详情(节点/任务/记录/当前状态)
- [ ] 审批结果触发业务状态变更 + 站内信/通知

### 8.3 业务表单审批联动矩阵

> 每个表单验证:开启审批 → 提交 → 走流程 → 通过/驳回 → 单据状态/打款标记联动。

- [ ] 合同(CONTRACT,`crm/contract`)
- [ ] 请假(LEAVE,`hrm/leave` 与 `oa/leave`)
- [ ] 报销(EXPENSE,`oa/expense`)
- [ ] 借款(LOAN,`oa/loan`)
- [ ] 出差(TRIP,`oa/trip`)
- [ ] 会议预订(MEETING_BOOKING,`oa/meeting-booking`)
- [ ] OA 自定义表单(OA_CUSTOM,`oa/form-data`,按 form_key)

---

## 9. OA(办公审批)

- [ ] 报销 `oa/expense`:明细行、审批、**标记已打款**(仅审批通过可标记)、删除(仅未提交)
- [ ] 借款 `oa/loan`:借款类型、预计还款日、审批、**标记已还清**、删除
- [ ] 出差 `oa/trip`:目的地/日期/预算、审批
- [ ] 会议预订 `oa/meeting-booking`:选会议室、时间冲突检测、审批、删除;会议室管理 `oa/meeting-room`(容量/设备/状态)
- [ ] OA 请假 `oa/leave`:请假类型/时长、审批
- [ ] 工作日志 `oa/work-log`:日报/周报/月报、今日完成/明日计划/问题
- [ ] 日程 `oa/schedule`:日历视图、提醒类型、状态(PENDING/DONE/CANCELED)
- [ ] 公告 `oa/notice`:草稿/发布/撤回、通知/公告类型、首页公告流
- [ ] 自定义表单 `oa/form-template`:表单设计器(字段/校验)、启停用;`oa/form-data` 填写/提交审批/列表
- [ ] 站内信 `oa/message`:收件箱/发件箱/未读数/标记已读

> 验证两套消息系统:旧 `enterprise/message` 与现 `oa/message`,确认线上生效的是后者。

---

## 10. HRM(人事)

- [ ] 部门 `hrm/department`:树形、父子、负责人、有子部门/员工时拒绝删除
- [ ] 岗位 `hrm/position`:按部门、有员工时拒绝删除
- [ ] 员工 `hrm/employee`:CRUD、关联系统用户、入职/离职自动写履历、变更部门/岗位/状态写履历
- [ ] 考勤 `hrm/attendance`:月度汇总(出勤/迟到/请假/加班)、按部门/月份筛选、打卡记录
- [ ] 请假 `hrm/leave`:申请(类型/时长)、审批(通过/驳回)
- [ ] 绩效 `hrm/performance`:创建(含指标明细)、自评、上级评审(分数/等级/评语)、状态流转
- [ ] 招聘 `hrm/recruitment`:职位(状态:草稿/招聘/暂停/关闭/满编)、候选人(状态:新简历→筛选→面试→offer→录用/淘汰)、面试时间

---

## 11. 财务(finance)

- [ ] 会计科目 `finance/account`:树形、余额方向(借/贷)、末级科目方可记账
- [ ] 凭证 `finance/voucher`:新增(自动编号,草稿)、**确认**(草稿→已确认,参与报表)、按日期/科目/状态筛选
- [ ] 发票 `finance/invoice`:收/开方向、自动算税额与价税合计、按方向/日期筛选
- [ ] 往来款 `finance/receivable`:应收/应付、**结算**(部分结算自动累计)、结算状态(未/部分/已结清)
- [ ] 报表 `finance/report`:利润表(日期范围)、资产负债表(截止日)数据正确

---

## 12. PSI(进销存)

### 12.1 基础

- [ ] 供应商 `psi/supplier`:CRUD、编号自动生成、启停用
- [ ] 仓库 `psi/warehouse`:CRUD、默认仓库不可删、启停用

### 12.2 采购

- [ ] 采购订单:明细行、自动汇总金额、状态(待入库/已入库/已关闭)、审批
- [ ] **采购入库**(高危:增库存)需单据已审批;库存增加
- [ ] 采购退货:退货给供应商、**退货出库**(高危:减库存)

### 12.3 销售

- [ ] 销售订单:明细、汇总、状态(待出库/已出库/已关闭)、关联合同、审批
- [ ] **销售出库**(高危:减库存,库存不足被拒绝)
- [ ] 销售退货:客户退回、**退货入库**(高危:增库存)

### 12.4 库存

- [ ] 其他入库单 `psi/stock-order`(INIT/PROFIT/GIFT/OTHER,**创建即生效**)
- [ ] 其他出库单(LOSS/SCRAP/USE/OTHER,**创建即生效**)
- [ ] 库存列表 `psi/stock`:按仓库/产品、低库存筛选
- [ ] 库存流水 `psi/movement`:出入库明细、按业务类型/产品/仓库筛选
- [ ] 资产 `psi/asset`:CRUD、自动编号、折旧/净值
- [ ] 报表 `psi/report`:采购汇总、销售排行

---

## 13. 项目(project)

- [ ] 项目 CRUD:状态(规划/进行/暂停/完成/取消)、优先级、进度(0-100)、成员、关联客户/合同、标签
- [ ] 项目详情(含任务列表)
- [ ] 任务:CRUD、负责人、截止日、优先级、**看板状态拖拽**(待办/进行/完成/取消)、排序

---

## 14. CMS(官网内容)

- [ ] 文章 `cms/article`:Markdown 正文、分类/标签、封面、置顶/热门、草稿/发布、分页/搜索
- [ ] 分类 `cms/category`:树形、父子
- [ ] 单页 `cms/page`:内部页/外部链接、slug
- [ ] 标签 `cms/tag`:CRUD
- [ ] (官网侧 ISR 缓存:发布后官网 5 分钟内生效,改完要刷两次属预期)

---

## 15. 知识库(kb)

- [ ] 分类树 `kb/category`
- [ ] 文档列表 `kb/document`、详情、草稿/发布
- [ ] 文档编辑器 `kb/document/editor`:TipTap 富文本 + **Yjs 实时协同编辑**(多人同时编辑同步)
- [ ] 版本历史 + 恢复历史版本

---

## 16. 网盘(cloud)

- [ ] 个人空间/部门/公共空间切换
- [ ] 新建文件夹、上传文件(走 FileUpload 双桶)、重命名、移动、删除(文件夹递归)
- [ ] 私有文件签名下载(1h 有效)
- [ ] 个人空间用量配额显示

---

## 17. AI / BI / 定时任务

- [ ] AI 报告 `ai/report`:生成日报/周报(脚本/跟进/报告)
- [ ] AI 智能体管理(`system/ai-agent`)、全局配置
- [ ] BI 分析 `analysis/{crm,finance,hrm,psi}`:各图表(漏斗/趋势/分布/排行)渲染、ECharts 按需加载
- [ ] 定时任务 `enterprise/job`:CRUD(6 段 cron)、启停、**手动触发一次**、执行日志 `enterprise/job-log`

---

## 18. 工作台(dashboard)

- [ ] 核心指标概览(客户/商机/合同/回款/待审批)
- [ ] 销售趋势、商机漏斗、客户分布、财务概览、回款趋势
- [ ] 待办、未读收件箱、公告流、统一日历(聚合各模块带日期待办)
- [ ] **容错**:任一统计区接口失败不影响其他区渲染(独立降级)

---

## 19. 横切特性专项

### 19.1 文件上传(双存储 / 双可见性)

> `FileUpload` / `ImageUpload` / `AttachmentsPanel`。

- [ ] OSS 直传(PUT 预签名)与本地代理两种驱动都能上传成功
- [ ] public 桶:上传后 URL 可直接访问
- [ ] private 桶:下载走 `/api/file/sign` 签名(1h),过期失效
- [ ] 大文件、多文件、删除/禁用附件
- [ ] 附件按 `biz_type` + `resource_id` 多态关联(客户/合同等详情抽屉附件 Tab)

### 19.2 导出 / 导入

- [ ] `ExportButtons`:CSV(含 BOM,Excel 不乱码)/ Excel,空数据导出、大数据导出、`fetchAll` 翻页全量、valueEnum 映射、特殊字符转义
- [ ] `ImportButton`(CRM 客户):下载模板(Bearer 鉴权)、上传 `.xlsx`、部分失败逐行错误报告

### 19.3 自定义字段

- [ ] `crm/field` 定义(INPUT/SELECT/DATE/...)按 form_key 生效
- [ ] 在客户等表单正确渲染与回填、提交保存
- [ ] OA 表单设计器 `oa/form-template/Designer` 产出的字段在填写页可用

### 19.4 实时通知(SSE)

- [ ] 第 5 章已覆盖:建连/重连/铃铛/弹窗/跳转/站内信

### 19.5 查重(DedupAlert)

- [ ] 录入客户/线索时,同名模糊 + 同电话精确 跨线索+客户实时提示(防抖,仅提示不阻断)

### 19.6 自动编号

- [ ] 第 6.9 节:各模块编号规则,用户手填优先、留空自动生成

### 19.7 e签宝电子合同

- [ ] 第 7.5 节:发起/补签署方/查状态(半自动:审批通过→渲染 PDF→READY→补签署方→发起)

---

## 20. 兼容性 / 性能 / 安全回归

### 20.1 浏览器兼容

- [ ] Chrome(最新)、Edge、Safari、Firefox 主流程通过
- [ ] 移动端窄屏布局不破(虽 admin 以桌面为主)

### 20.2 性能

- [ ] 首屏加载(懒加载按需 chunk,echarts 不进首包)
- [ ] 大列表(千行级)分页/虚拟滚动不卡
- [ ] 切换模块无明显白屏

### 20.3 安全

- [ ] 敏感字段(密码/token/secret)不出现在网络日志/控制台
- [ ] 访问日志/操作日志已脱敏(手机/身份证/银行卡/邮箱)
- [ ] XSS:富文本/Markdown 输入经清理(后端 XSS 清理 + 前端不直接 innerHTML 注入未消毒内容)
- [ ] SQL 标识符(排序/筛选字段)不可被客户端输入直接拼接(后端侧)
- [ ] 越权:横向越权(改 URL 上的 id 访问他人数据)被后端拒绝

---

## 21. 回归执行记录模板

每次回归复制本节填写:

```
回归日期:    YYYY-MM-DD
执行人:      
环境:        [ ] 本地 dev  [ ] 生产
后端版本:    git commit __________
admin 版本:  git commit __________
覆盖范围:    [ ] 全量  [ ] 冒烟  [ ] 仅模块:__________

通过项数:____  失败项数:____  阻塞项数:____

失败/阻塞清单:
1. [模块-用例] 现象 / 复现步骤 / 关联 issue
2. ...

结论:  [ ] 可发布  [ ] 需修复后复测  [ ] 阻塞发布
```

---

## 附录:模块-页面-菜单 component 映射速查

> 用于"页面路径 ↔ 后端菜单 component"一致性核对(路由由菜单驱动)。

| 页面目录 | 菜单 component | 覆盖章节 |
| --- | --- | --- |
| `system/user` `role` `menu` `api` `dict` `config` `site` `homepage-config` `number` `loginlog` `operlog` `reset` `oauth` `ai-config` `ai-agent` | `system/<name>/index` | §6 |
| `crm/customer` `customer-sea` `pool` `contact` `opportunity` `contract` `contract-template` `follow` `product` `ticket` `field` `stage` `setting` | `crm/<name>/index` | §7 |
| `crm/lead` `lead-sea` `lead-pool` | `crm/<name>/index` | §7.3 |
| `approval/flow` `todo` `done` `mine` | `approval/<name>/index` | §8 |
| `oa/expense` `loan` `trip` `meeting-room` `meeting-booking` `leave` `work-log` `schedule` `notice` `form-template` `form-data` `message` | `oa/<name>/index` | §9 |
| `hrm/department` `position` `employee` `attendance` `leave` `performance` `recruitment` | `hrm/<name>/index` | §10 |
| `finance/account` `voucher` `invoice` `receivable` `report` | `finance/<name>/index` | §11 |
| `psi/supplier` `warehouse` `purchase-order` `purchase-return` `sales-order` `sales-return` `stock-order` `stock` `movement` `asset` `report` | `psi/<name>/index` | §12 |
| `project` | `project/index` | §13 |
| `cms/article` `category` `page` `tag` | `cms/<name>/index` | §14 |
| `kb/category` `kb/document`(+ `editor` 额外路由) | `kb/<name>/index` | §15 |
| `cloud/index` | `cloud/index` | §16 |
| `ai/report` | `ai/report/index` | §17 |
| `analysis/{crm,finance,hrm,psi}` | `analysis/<name>/index` | §17 |
| `enterprise/job` `job-log` `message` | `enterprise/<name>/index` | §17 |
| `dashboard` `login` `profile` `error/404` | (静态路由) | §1/§3/§4 |
