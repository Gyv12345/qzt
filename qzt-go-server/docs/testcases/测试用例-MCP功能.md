# 测试用例 — 按 MCP 功能编写

> 覆盖范围：以 qzt MCP（`internal/mcp/`）暴露的全部工具能力为需求规格，按模块编写，共 **25 章**。
> 覆盖 MCP 全部模块：CRM（客户/线索/商机/合同回款/联系人/跟进/产品/工单/自定义字段查重）、Dashboard、审批、PSI 进销存、HRM 人事、系统管理、CMS、站点与企业微信、**财务**、**项目**、**OA 办公**、**知识库**、**网盘**、**定时任务**、**公共能力**，以及 **MCP 认证与操作级权限机制**（第二十四章，MCP 协议层独有）。
>
> 用例约定：
> - **操作步骤**：默认通过 admin 后台 UI 执行（与 MCP 后端能力一一对应）；括号内标注等价的 MCP 工具名（如 `crm_customer_create`）。财务/项目/OA/知识库/网盘/定时任务等模块以 **MCP 工具能力**为验证对象（admin 若无对应页面，则以工具/API 调用为准）。
> - **优先级**：P0 冒烟必过 / P1 主流程 / P2 边界与异常 / P3 体验优化。
> - **结果判定**：与"预期结果"一致记 ✅ 通过；不符记 ❌ 问题；可用但不顺记 ⚠️ 优化。
> - **测试前**：确认生产环境可用、有超管账号（admin/shijie123）；MCP 测试需 `qzt_` 前缀 API Key，入口 `POST /mcp`（生产 `https://devlovecode.com/mcp`，Streamable HTTP，`Authorization: Bearer qzt_xxx`）。

## 目录

| 章节 | 模块 | 前缀 |
|------|------|------|
| 一 | 工作台 Dashboard | DASH |
| 二~十 | CRM（客户/线索/商机/合同回款/联系人/跟进/产品/工单/自定义字段查重） | CRM-* |
| 十一 | 审批管理 | APR |
| 十二 | 进销存 PSI | PSI-* |
| 十三 | 人事 HRM | HRM-* |
| 十四 | 系统管理 | SYS-* |
| 十五 | 内容管理 CMS | CMS-* |
| 十六 | 站点配置与企业微信 | SITE / WECOM |
| 十七 | 财务管理 | FIN-* |
| 十八 | 项目管理 | PRJ / PRJ-TASK |
| 十九 | OA 办公自动化 | OA-* |
| 二十 | 知识库 | KB-* |
| 二十一 | 网盘 | CLOUD-* |
| 二十二 | 定时任务 | JOB |
| 二十三 | 公共能力 | COMM-* |
| 二十四 | MCP 认证与操作级权限机制 | MCP-AUTH / MCP-PERM |

---

## 一、工作台 Dashboard（DASH）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| DASH-001 | 工作台核心指标展示 | 已有业务数据 | 登录后台→进入工作台首页 | 客户总数/商机总数/合同总额/已回款/待审批/库存预警/未读消息 等卡片正确显示数值（参考 dashboard_overview：客户8/商机3/合同150100/已回款40000） | P0 |
| DASH-002 | 商机漏斗各阶段数量与金额 | 已有商机数据 | 工作台→点击「商机漏斗」或对应分析页 | 各阶段（初步接触/已验证/方案/谈判/赢单/输单）显示数量与金额合计，与列表数据一致 | P1 |
| DASH-003 | 回款趋势折线图 | 已有回款记录 | 工作台→近 N 天回款趋势 | 折线图按日展示回款金额，切换天数(7/30/90)数据随之变化 | P1 |
| DASH-004 | 指标卡片点击跳转 | 指标存在 | 点击「待审批」「合同」等卡片 | 正确跳转到对应模块列表页 | P2 |

---

## 二、CRM - 客户管理（CRM-CUS）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| CRM-CUS-001 | 新建客户（必填仅名称） | 已登录 | 客户列表→新建→只填名称→保存 | 创建成功，列表出现该客户，自动生成客户编号（KH+日期+序号） | P0 |
| CRM-CUS-002 | 新建客户完整信息 | - | 填名称+级别(A/B/C)+来源+行业+备注→保存 | 所有字段正确保存，详情页回显一致 | P0 |
| CRM-CUS-003 | 客户列表分页与搜索 | 有≥2条数据 | 翻页→输入名称关键词搜索 | 分页正常，关键词命中名称的客户被过滤显示 | P0 |
| CRM-CUS-004 | 客户详情含联系人 | 客户有联系人 | 点客户名称进详情 | 显示客户基础信息+联系人列表 tab | P1 |
| CRM-CUS-005 | 编辑客户字段 | 存在客户 | 详情→编辑→改级别/行业→保存 | 修改生效，列表/详情同步更新 | P0 |
| CRM-CUS-006 | 客户转移给他人 | 存在客户+多用户 | 客户操作→转移→选择新负责人→确认 | 负责人变更，新负责人可在其列表看到，原负责人不可见（依数据权限） | P1 |
| CRM-CUS-007 | 释放客户到公海 | 存在客户 | 客户操作→释放到公海→填原因→确认 | 客户进入公海池(in_pool=1)，原负责人列表消失，公海列表可见 | P1 |
| CRM-CUS-008 | 从公海捞取客户 | 公海有客户 | 公海池→领取 | 客户成为当前用户负责，移出公海 | P1 |
| CRM-CUS-009 | 客户状态冻结/流失 | 存在客户 | 编辑状态→改为冻结(2)/流失(3) | 状态正确变更，列表可按状态筛选 | P2 |
| CRM-CUS-010 | 客户数据权限隔离 | 不同角色用户 | 用普通销售账号登录 | 仅能看到数据权限范围内（本人/本部门）的客户 | P1 |

---

## 三、CRM - 线索管理（CRM-LEAD）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| CRM-LEAD-001 | 新建线索 | - | 线索列表→新建→填名称+联系人+电话+来源→保存 | 创建成功，状态默认「新建」 | P0 |
| CRM-LEAD-002 | 线索列表筛选 | 有数据 | 按来源/行业/级别/状态筛选 | 结果正确过滤 | P1 |
| CRM-LEAD-003 | 线索详情查看 | 存在线索 | 点线索进详情 | 显示线索全部字段 | P1 |
| CRM-LEAD-004 | 线索转化为客户 | 存在「新建/跟进中」线索 | 线索操作→转化为客户 | 生成对应客户，线索状态变「已转化」 | P0 |
| CRM-LEAD-005 | 已转化线索再次转化 | 线索状态=已转化 | 再次点转化 | 应提示已转化或禁止重复转化 | P2 |
| CRM-LEAD-006 | 线索转移/释放公海 | 多用户/公海池 | 转移或释放到线索公海 | 负责人变更或进线索公海池 | P1 |
| CRM-LEAD-007 | 标记线索无效 | 存在线索 | 改状态=无效(4) | 状态正确，可被筛选排除 | P2 |

---

## 四、CRM - 商机管理（CRM-OPP）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| CRM-OPP-001 | 新建商机（关联客户） | 存在客户 | 商机列表→新建→选客户+名称→保存 | 创建成功，阶段默认 PROSPECTING，负责人=当前用户 | P0 |
| CRM-OPP-002 | 商机带金额与预计成交日 | - | 填预期金额+预计成交日期+概率→保存 | 字段正确保存 | P1 |
| CRM-OPP-003 | 商机阶段正向流转 | 存在商机 | 改阶段 PROSPECTING→...→WON（每步 change_stage） | 阶段逐级变更并记录阶段历史，漏斗数据同步 | P0 |
| CRM-OPP-004 | 商机阶段变更为输单 | 存在商机 | 改阶段→LOST，填原因 | 状态变输单，原因记录 | P1 |
| CRM-OPP-005 | 商机列表按阶段筛选 | 有多阶段商机 | 选择某阶段过滤 | 仅显示该阶段商机 | P1 |
| CRM-OPP-006 | 赢单商机统计 | 有 WON 商机 | 看工作台/漏斗 | 赢单数量与金额统计正确（参考：opportunity_won=1） | P1 |

---

## 五、CRM - 合同与回款（CRM-CTC）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| CRM-CTC-001 | 新建合同（关联客户） | 存在客户 | 合同列表→新建→名称+客户+金额→保存 | 创建成功，阶段默认 DRAFT，自动生成合同编号 | P0 |
| CRM-CTC-002 | 合同起止日期与签订日期 | - | 填开始/结束/签订日期→保存 | 日期正确回显 | P1 |
| CRM-CTC-003 | 合同列表按阶段筛选 | 有多阶段合同 | 筛选 DRAFT/EXECUTING/COMPLETED | 结果正确（参考：现有3个合同） | P1 |
| CRM-CTC-004 | 创建回款计划 | 存在合同 | 合同详情→回款计划→新增（日期+金额） | 计划生成，汇总页计划列表显示 | P0 |
| CRM-CTC-005 | 登记回款记录 | 存在合同+计划 | 回款记录→新增（金额>0+日期+方式），关联计划 | 已回款累计增加，关联计划状态变「已回款」（参考：已回款40000） | P0 |
| CRM-CTC-006 | 回款金额校验 | 存在合同 | 登记金额≤0 或为空 | 应拦截报错，不予提交 | P2 |
| CRM-CTC-007 | 回款汇总金额一致性 | 有回款记录 | 看回款汇总 | 合同总额=已回款+未回款，与计划/记录合计一致 | P1 |
| CRM-CTC-008 | 合同发起审批 | 合同DRAFT+合同审批流启用 | 合同→提交审批 | 进入审批中，状态流转，审批待办产生 | P0 |
| CRM-CTC-009 | 合同模板变量渲染 | 存在模板 | 新建模板用 ${customerName} 等变量→基于模板生成 | 占位符正确替换为实际值 | P2 |

---

## 六、CRM - 联系人（CRM-CON）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| CRM-CON-001 | 为客户新增联系人 | 存在客户 | 客户详情→联系人→新增（姓名+电话+职位） | 联系人生成，归属该客户 | P0 |
| CRM-CON-002 | 关键决策人标记 | 存在联系人 | 编辑→勾选关键决策人 | 标记保存，列表/详情可识别 | P1 |
| CRM-CON-003 | 查询客户全部联系人 | 客户有多联系人 | 客户详情联系人 tab | 显示该客户全部联系人 | P1 |
| CRM-CON-004 | 编辑/删除联系人 | 存在联系人 | 改电话→保存；再删除 | 编辑生效；删除后列表消失 | P1 |
| CRM-CON-005 | 停用联系人 | 存在联系人 | 状态改停用(2) | 停用后不再参与默认选择 | P2 |

---

## 七、CRM - 跟进（CRM-FOL）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| CRM-FOL-001 | 新增跟进记录（关联客户） | 存在客户 | 跟进→新增记录（方式微信/电话/拜访+内容） | 记录生成，跟进人=当前用户，出现在时间线 | P0 |
| CRM-FOL-002 | 跟进时间线按对象聚合 | 客户/商机有跟进 | 看客户详情时间线 | 按时间倒序展示该客户所有跟进 | P1 |
| CRM-FOL-003 | 创建跟进计划（待办） | - | 跟进计划→新增（计划时间+提醒时间+内容） | 待办生成，到点应有提醒 | P1 |
| CRM-FOL-004 | 跟进方式校验 | - | 方式必填，内容必填 | 缺必填项拦截报错 | P2 |

---

## 八、CRM - 产品（CRM-PRD）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| CRM-PRD-001 | 新建产品（默认上架） | - | 产品→新建（名称+标准价+单位+分类） | 创建成功，状态=上架，自动生成编号 | P0 |
| CRM-PRD-002 | 产品成本价/标准价 | - | 填成本价+标准价→保存 | 价格正确回显 | P1 |
| CRM-PRD-003 | 产品上下架 | 存在产品 | 状态改下架(2) | 下架后业务单据不可再选该产品 | P1 |
| CRM-PRD-004 | 产品按分类/关键词搜索 | 有数据 | 输入关键词或选分类 | 列表正确过滤 | P1 |

---

## 九、CRM - 售后工单（CRM-TKT）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| CRM-TKT-001 | 新建工单（默认待处理） | - | 工单→新建（标题+描述+优先级） | 创建成功，状态=待处理，优先级默认普通 | P0 |
| CRM-TKT-002 | 关联客户/合同 | 存在客户合同 | 建工单选客户+合同 | 关联正确，详情显示 | P1 |
| CRM-TKT-003 | 工单状态流转 | 存在工单 | 待处理(1)→处理中(2)→已解决(3)→已关闭(4) | 每步记录处理日志，解决/关闭可填解决方案 | P0 |
| CRM-TKT-004 | 重开工单 | 已关闭工单 | 状态改已重开(5) | 工单可再次处理 | P2 |
| CRM-TKT-005 | 已关闭工单不可编辑 | 已关闭工单 | 尝试编辑 | 应禁止编辑或置灰 | P2 |
| CRM-TKT-006 | 工单按优先级/状态筛选 | 有数据 | 筛选紧急/高 | 结果正确 | P1 |

---

## 十、CRM - 自定义字段与查重（CRM-EXT）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| CRM-FLD-001 | 新增自定义字段（客户模块） | - | 字段管理→客户模块→新增（类型 INPUT/SELECT 等） | 字段定义生成，客户表单出现该字段 | P0 |
| CRM-FLD-002 | 字段选项配置 | 字段类型=SELECT | 配选项 A/B→保存 | 选项正确，下拉可选 | P1 |
| CRM-FLD-003 | 录入自定义字段值 | 字段已定义 | 新建客户填自定义字段→保存 | 值正确保存并回显 | P1 |
| CRM-FLD-004 | 删除自定义字段 | 存在字段 | 删除字段 | 字段消失，提示已有数据不可见 | P2 |
| CRM-FLD-005 | 线索自定义字段转化映射 | LEAD 字段配 convert_target | 设置映射到客户字段 | 线索转化客户时该字段值带入客户 | P2 |
| CRM-DUP-001 | 录入前查重（名称模糊） | 有相似客户 | 录入客户前查重，输入相似名称 | 返回名称/电话相似的线索与客户记录 | P1 |
| CRM-DUP-002 | 查重电话精确匹配 | 有该电话 | 输入已存在电话查重 | 命中对应客户/线索联系人 | P1 |

---

## 十一、审批管理（APR）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| APR-001 | 审批流列表展示 | 已有审批流 | 进审批→流程列表 | 显示16个流程，含启用/停用、form_type（参考：合同/订单/报销等） | P0 |
| APR-002 | 发起合同审批 | 存在DRAFT合同+合同审批流启用(id=2) | 合同→提交审批 | 审批实例创建，待办产生，合同状态变更 | P0 |
| APR-003 | 我的待办列表 | 有待办任务 | 审批→待办 | 列出当前用户待审批任务 | P0 |
| APR-004 | 审批通过 | 存在待办 | 待办→通过(可填意见) | 任务完成，流转下一节点或实例完成 | P0 |
| APR-005 | 审批驳回 | 存在待办 | 待办→驳回+必填原因 | 整实例驳回，发起人收到通知 | P0 |
| APR-006 | 撤回审批（提交人） | 审批中实例 | 我发起的→撤回 | 实例撤回，状态变更 | P1 |
| APR-007 | 非提交人撤回 | 他人实例 | 尝试撤回 | 应禁止（仅提交人可撤回） | P2 |
| APR-008 | 已办列表 | 有已处理任务 | 审批→已办 | 显示已通过/驳回记录 | P1 |
| APR-009 | 我发起的列表 | 有发起记录 | 审批→我发起 | 显示本人发起的审批及当前状态 | P1 |
| APR-010 | 创建新审批流 | - | 新建流程(选 form_type 如 ORDER) | 流程创建成功(默认未启用) | P1 |
| APR-011 | 设计审批节点图 | 存在未启用流程 | 设计节点(START/APPROVAL/CONDITION/END)+审批人→保存 | 节点图保存成功，生成新版本 | P1 |
| APR-012 | 启用/禁用流程 | 流程已设计 | 启用 | 状态变启用，对应单据可发起审批；禁用后不可发起 | P1 |
| APR-013 | 停用流程不可发起审批 | 流程 enable=0 | 对应单据提交审批 | 应提示无可用流程或禁止 | P2 |
| APR-014 | 审批实例详情 | 存在实例 | 查看实例详情 | 显示审批任务/记录/当前状态/节点图 | P1 |
| APR-015 | 同一 form_type 唯一流程 | 已有该类型流程 | 再建同类型 | 应唯一约束或替换，GetByFormType 返回正确（查全部状态，含停用） | P2 |
| APR-016 | 设计审批节点图 | 存在未启用流程（approval_flow_create 创建） | approval_flow_save_design：节点 START→APPROVAL→CONDITION→END，配审批人（用户/角色/部门负责人/上级）+ 多人会签模式（ALL/ANY）+ 空审批人动作 + 串行/并行 | 节点图保存成功，生成新版本；design_json 含 nodes/approvers/conditions/links 四数组 | P0 |
| APR-017 | 审批流启用/禁用 | 流程已设计节点图 | approval_flow_enable(enable=true) | 状态变启用，对应 form_type 单据可发起审批；enable=false 后 approval_push 应提示无可用流程 | P0 |
| APR-018 | 审批流详情含节点图 | 存在流程 | approval_flow_get(id) | 返回流程基础信息 + 节点图 + 审批人配置，与设计保存一致 | P1 |
| APR-019 | 条件分支节点路由 | 流程含 CONDITION 节点 | 单据字段命中条件→发起审批→自动走对应分支 | 实例按条件求值（AND/OR + EQ/NE/GT/LT 等）路由到正确分支节点 | P2 |
| APR-020 | 驳回必填原因 | 存在待办 | approval_reject 不传 comment | 应拒绝执行，提示驳回原因必填 | P2 |
| APR-021 | 预置流程不可删 | 预置审批流（enable=0） | 尝试删除预置流程 | 应禁止删除（预置流程仅可停用不可删） | P2 |

---

## 十二、进销存 PSI（PSI）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| PSI-WH-001 | 仓库列表/详情 | 有仓库 | 进销存→仓库 | 列表正常，详情显示地址/状态 | P1 |
| PSI-SUP-001 | 供应商列表/详情 | 有供应商 | 供应商 | 列表正常，可按名称搜索、按状态筛选 | P1 |
| PSI-STK-001 | 库存列表 | 有库存 | 库存 | 各仓库产品库存量正确显示 | P0 |
| PSI-STK-002 | 低库存筛选 | 有低库存产品 | 勾选「仅看低库存」 | 仅显示低于阈值的产品 | P1 |
| PSI-STK-003 | 库存流水(出入库明细) | 有流水 | 库存流水 | 按业务类型/产品/仓库过滤，明细正确 | P1 |
| PSI-STK-004 | 入库单列表 | 有入库单 | 入库单 | 按 biz_type/仓库过滤正确 | P1 |
| PSI-STK-005 | 出库单列表 | 有出库单 | 出库单 | 过滤与明细正确 | P1 |
| PSI-PO-001 | 采购订单列表/详情 | 有采购单 | 采购订单 | 列表+明细(商品行)正确，可按状态(待入库/已入库/已关闭)、审批状态过滤 | P0 |
| PSI-SO-001 | 销售订单列表/详情 | 有销售单 | 销售订单 | 列表+明细正确，可按客户/状态/审批状态过滤 | P0 |
| PSI-MV-001 | 库存调拨 | 多仓库 | 调拨产品 A仓→B仓 | A减B增，流水记录正确 | P1 |
| PSI-ASSET-001 | 资产管理 | 有资产 | 资产 | 资产列表与状态正常 | P2 |
| PSI-WH-002 | 新建/编辑/删除仓库 | - | psi_warehouse_create(code+name+地址)→保存；再 update；再 delete | 创建/修改生效；**默认仓库(is_default=1)不可删除** | P1 |
| PSI-SUP-002 | 新建/编辑/删除供应商 | - | psi_supplier_create(name)→update→delete | 编号留空自动生成；CRUD 生效，可按名称/状态筛选 | P1 |
| PSI-PO-002 | 新建采购订单 | 存在供应商+仓库+产品 | psi_purchase_order_create(supplier_id+warehouse_id+items[{product_id,quantity,unit_price}]) | 自动生成单号，默认状态=待入库，自动汇总金额（数量×单价-优惠） | P0 |
| PSI-PO-003 | 采购入库（高危） | 采购单待入库且已审批通过（或未启用审批） | psi_purchase_order_stock_in(id) | **库存增加**，采购单状态→已入库，库存流水记录正确；未审批应拒绝 | P0 |
| PSI-PO-004 | 采购单仅待入库可改 | 已入库采购单 | psi_purchase_order_update | 应拒绝（仅待入库且未审批允许修改） | P2 |
| PSI-PR-001 | 采购退货出库（高危） | 存在已入库采购单 | psi_purchase_return_create→stock_out | 退货单默认待出库；出库**库存减少**，流水记录正确 | P1 |
| PSI-SO-002 | 新建销售订单 | 存在客户+仓库+产品 | psi_sales_order_create(customer_id+warehouse_id+items) | 自动生成单号，默认待出库，可关联合同(contract_id)，自动汇总金额 | P0 |
| PSI-SO-003 | 销售出库（高危） | 销售单待出库+库存充足+已审批通过 | psi_sales_order_stock_out(id) | **库存扣减**，状态→已出库；库存不足应拒绝 | P0 |
| PSI-SO-004 | 销售出库库存不足 | 库存<出库量 | psi_sales_order_stock_out | 应拒绝并提示库存不足 | P2 |
| PSI-SR-001 | 销售退货入库（高危） | 存在已出库销售单 | psi_sales_return_create→stock_in | 退货单默认待入库；入库**库存增加** | P1 |
| PSI-STK-006 | 其他入库单（立即生效） | 存在仓库+产品 | psi_stock_in_order_create(warehouse_id+biz_type[INIT/PROFIT/GIFT/OTHER]+items[{product_id,quantity,unit_cost}]) | **创建即立即增加库存**（无审批，用于期初/盘盈/赠品），高危 | P1 |
| PSI-STK-007 | 其他出库单（立即生效） | 存在库存 | psi_stock_out_order_create(warehouse_id+biz_type[LOSS/SCRAP/USE/OTHER]+items) | **创建即立即扣减库存**（无审批，用于盘亏/报废/领用），高危；库存不足应拒绝 | P1 |
| PSI-ASSET-002 | 资产 CRUD | - | psi_asset_create(name+分类+采购价+使用年限)→update→delete | 自动生成资产编号；CRUD 生效，可按分类/归属人/部门/状态筛选 | P2 |

---

## 十三、人事 HRM（HRM）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| HRM-DEPT-001 | 部门树展示 | 有部门 | 人事→部门 | 树形层级正确显示，含子部门 | P0 |
| HRM-DEPT-002 | 部门新建/编辑 | - | 新建部门→保存；再编辑 | 创建/修改生效，树更新 | P1 |
| HRM-POS-001 | 职位列表/按部门过滤 | 有职位 | 职位 | 列表正常，按部门筛选正确 | P1 |
| HRM-EMP-001 | 员工列表/搜索 | 有员工 | 员工→按姓名/工号搜索 | 命中正确，可按部门/职位/状态(在职/试用/离职)筛选 | P0 |
| HRM-EMP-002 | 员工详情 | 存在员工 | 点员工进详情 | 显示完整信息（含部门/职位） | P1 |
| HRM-ATT-001 | 员工打卡记录查询 | 有打卡 | 查某员工指定日期范围 | 返回打卡记录，起止日期边界正确 | P1 |
| HRM-ATT-002 | 考勤月度汇总 | 有数据 | 选部门+月份(YYYY-MM) | 出勤/迟到/缺卡统计正确 | P1 |
| HRM-PAY-001 | 薪资单列表 | 有薪资数据 | 选部门+月份 | 薪资单正确显示，可过滤 | P2 |
| HRM-LEAVE/PERF/RECRUIT | 请假/绩效/招聘 | - | 进入对应页 | 列表与基本操作正常 | P2 |
| HRM-DEPT-003 | 部门新建/编辑（MCP 工具） | - | hrm_department_create(name+code+parent_id)→update | 创建/修改生效，树更新；**code 唯一** | P1 |
| HRM-DEPT-004 | 部门删除约束 | 部门有子部门或员工 | hrm_department_delete | 应拒绝（有子部门或员工不可删） | P2 |
| HRM-POS-002 | 岗位 CRUD | 存在部门 | hrm_position_create(name+code+department_id)→update→delete | CRUD 生效；有员工的岗位不可删 | P1 |
| HRM-EMP-003 | 员工新建/编辑 | 存在部门+岗位 | hrm_employee_create(emp_no+name+department_id+position_id)→update | 创建**自动写一条入职履历**；改部门/岗位/状态自动写履历；emp_no 唯一 | P0 |
| HRM-EMP-004 | 员工离职 | 在职员工 | hrm_employee_update(status=离职+resign_date) | 状态变更并写离职履历 | P1 |
| HRM-ATT-003 | 员工打卡 | 存在员工 | hrm_attendance_clock(clock_type=CHECK_IN/CHECK_OUT) | 打卡成功；同天同类型重复打卡则**更新**而非新增 | P1 |
| HRM-LEAVE-001 | 申请请假 | 存在员工 | hrm_leave_create(employee_id+leave_type+start/end+duration_days) | 请假单生成，单号自动生成，待审批 | P1 |
| HRM-LEAVE-002 | 审批请假单 | 存在待审批请假单 | hrm_leave_approve(id, approved=true/false) | 通过/驳回生效，状态变更 | P1 |
| HRM-OT-001 | 申请加班 | 存在员工 | hrm_overtime_create(employee_id+start/end+duration_hours+compensate_type[PAY/TO]) | 加班单生成，待审批 | P1 |
| HRM-OT-002 | 审批加班单 | 待审批加班单 | hrm_overtime_approve(id, approved) | 通过/驳回生效 | P1 |
| HRM-PAY-002 | 保存薪酬结构 | 存在员工 | hrm_payroll_save_structure(employee_id+base_salary+各项津贴+社保/公积金基数与比例) | 结构 upsert 生效（有则更新无则创建） | P1 |
| HRM-PAY-003 | 生成工资条 | 已配薪酬结构 | hrm_payroll_generate(employee_id+year_month) | 自动算社保/公积金/个税/实发，生成草稿工资条 | P1 |
| HRM-PAY-004 | 工资条确认与发放 | 存在草稿工资条 | hrm_payroll_confirm→hrm_payroll_mark_paid | 草稿→已确认→已发放；仅草稿可确认，仅已确认可标记发放 | P2 |
| HRM-PERF-001 | 创建绩效考核 | 存在员工 | hrm_performance_create(title+employee_id+start/end+items[指标JSON]) | 考核生成（含指标明细），状态=进行中 | P1 |
| HRM-PERF-002 | 员工绩效自评 | 进行中考核 | hrm_performance_self_review(id+self_score+self_comment) | 自评提交，状态→自评完成；仅进行中可自评 | P2 |
| HRM-PERF-003 | 上级评审绩效 | 自评完成/评审中考核 | hrm_performance_review(id+review_score+grade+comment) | 评审完成，状态→已完成，记录最终分 | P2 |
| HRM-JOB-001 | 招聘职位 CRUD | - | hrm_job_create(title+headcount+salary_range)→update(status=招聘中)→delete | 创建默认草稿；改招聘中记录发布日期；CRUD 生效 | P2 |
| HRM-CAND-001 | 候选人流转 | 存在职位 | hrm_candidate_create(job_id+name+phone)→update(status:新简历→筛选→面试→offer→录用/淘汰) | 候选人按状态流转，可按职位/状态/关键词筛选 | P2 |

---

## 十四、系统管理 SYSTEM（SYS）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| SYS-USER-001 | 用户列表分页 | 有用户 | 系统管理→用户 | 分页正常 | P0 |
| SYS-USER-002 | 新建用户（含角色） | - | 新建(用户名+密码+角色)→保存 | 用户创建，分配角色生效，可登录 | P0 |
| SYS-USER-003 | 用户启停/改密 | 存在用户 | 禁用用户；改密码 | 禁用后不可登录；改密后新密码可登录 | P1 |
| SYS-USER-004 | 删除用户(软删) | 存在用户 | 删除 | 用户列表消失（软删除），关联数据不破坏 | P2 |
| SYS-ROLE-001 | 角色列表 | 有角色 | 角色 | 列表正常 | P0 |
| SYS-ROLE-002 | 新建角色 | - | 新建(名称+code 如 SALES_MANAGER) | 角色创建 | P1 |
| SYS-ROLE-003 | 角色分配菜单权限 | 存在角色 | 角色→分配菜单(覆盖式) | 角色用户登录后仅看到被分配菜单（参考 admin-menu-visibility 机制） | P0 |
| SYS-ROLE-004 | 角色分配 API 权限 | 存在角色 | 角色→分配 API(Casbin 覆盖式) | 角色用户仅能调用被授权接口；super_admin 全量绕过 | P0 |
| SYS-ROLE-005 | super_admin 绕过 RBAC | super_admin 角色用户 | 访问未授权接口 | 不受 Casbin 限制（参考 casbin-superadmin-bypass） | P1 |
| SYS-MENU-001 | 菜单树展示 | 有菜单 | 菜单管理 | 完整菜单树正确 | P0 |
| SYS-MENU-002 | 新建菜单/按钮权限 | - | 新建目录/菜单/按钮(type 0/1/2)+permission | 创建成功，前端动态路由生效（component 路径对应文件） | P1 |
| SYS-MENU-003 | 新菜单可见性 | 新建菜单并分配 | 用对应角色登录 | 前端渲染前两级+授权后才可见，否则不可见 | P1 |
| SYS-MENU-004 | 编辑/删除菜单 | 存在菜单 | 编辑；删除 | 生效，删除子菜单级联处理 | P2 |
| SYS-API-001 | API 列表 | 有 API | API 管理 | Casbin 权限项列表正常 | P1 |
| SYS-API-002 | 新建/删除 API | - | 新建(path+method+group)→保存；删除 | 生效，可用于角色授权 | P2 |
| SYS-DICT-001 | 字典列表/搜索 | 有34个字典 | 字典管理→搜索 | 列表正常（客户状态/级别A-B-C/来源/行业等） | P0 |
| SYS-DICT-002 | 新建字典(含字典项) | - | 新建(code 如 TEST_DICT)+多项 items | 创建成功，业务下拉引用 | P1 |
| SYS-DICT-003 | 编辑字典(覆盖项) | 存在字典 | 改名称/增删字典项→保存(覆盖式) | 项正确更新 | P1 |
| SYS-DICT-004 | 删除字典 | 存在字典 | 删除 | 字典及项删除 | P2 |
| SYS-NUM-001 | 自动编号规则 | - | 编号管理 | 规则(前缀+日期+序号)配置生效，业务单据留空自动生成 | P1 |
| SYS-LOG-001 | 登录日志(含IP归属) | 有登录记录 | 登录日志 | IP 归属地(离线 ip2region)显示正确 | P2 |
| SYS-LOG-002 | 操作日志 | 有操作 | 操作日志 | 脱敏后记录操作人与动作 | P2 |
| SYS-CFG-001 | 参数配置/站点配置 | - | 系统配置/站点 | 配置读写生效 | P2 |
| SYS-OAUTH-001 | 第三方登录配置 | - | 企业微信登录配置 | 配置/启用/禁用正常 | P3 |

---

## 十五、内容管理 CMS（CMS）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| CMS-ART-001 | 文章列表/搜索/分类状态过滤 | 有文章 | 内容→文章 | 关键词/分类/状态过滤正确 | P0 |
| CMS-ART-002 | 新建文章(Markdown正文) | - | 新建(标题+正文+摘要+封面)→发布 | 创建成功，状态=已发布 | P0 |
| CMS-ART-003 | 草稿/发布切换 | 存在文章 | 状态切0/1 | 状态正确，前台对应展示/隐藏 | P1 |
| CMS-ART-004 | 置顶/热门 | 存在文章 | 设 is_top/is_hot | 标记生效，前台优先展示 | P2 |
| CMS-ART-005 | 编辑/删除文章 | 存在文章 | 编辑→保存；删除 | 生效 | P1 |
| CMS-CAT-001 | 分类树 | 有分类 | 分类 | 树形结构正确，含父子 | P1 |
| CMS-CAT-002 | 新建/编辑/删除分类 | - | 新建(含 parent_id) | 创建生效，删除级联处理 | P2 |
| CMS-PAGE-001 | 单页列表/详情 | 有单页 | 单页 | 列表+正文正确 | P1 |
| CMS-PAGE-002 | 新建单页(内部页/外部链接) | - | link_type=page/link | 内部页存正文；外部链接存 URL | P2 |
| CMS-TAG-001 | 标签列表/增删改 | 有标签 | 标签 | CRUD 正常 | P2 |

---

## 十六、站点配置与企业微信（SITE/WECOM）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| SITE-001 | 站点信息读取 | - | 调 site_config_get | 返回企业名/logo/联系方式/备案号等 | P1 |
| SITE-002 | 更新站点信息 | 超管 | 改 logo/企业名/Hero/SEO→保存 | 字段保存，前台/SEO 生效 | P1 |
| WECOM-001 | 创建企业微信登录配置 | 有 CorpID+Secret | 新建扫码登录配置 | 创建成功 | P2 |
| WECOM-002 | 启用/禁用企微登录 | 存在配置 | enable true/false | 启用后登录页出现企微扫码；禁用后消失 | P2 |
| WECOM-003 | 扫码绑定跨设备流程 | 配置完成 | 手机扫码→OAuth→移动端回调页 | 回调正确跳转并完成绑定（参考 wecom-oauth-config） | P3 |

---

## 十七、财务管理 FINANCE（FIN）

> 覆盖会计科目、凭证、应收应付往来款、发票、财务报表。凭证「确认」后才参与报表计算是核心规则。

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| FIN-ACC-001 | 新建会计科目 | - | finance_account_create(code+name+type[ASSET/LIABILITY/EQUITY/INCOME/EXPENSE]+balance_dir[DEBIT/CREDIT]+parent_id+is_leaf) | 科目创建，支持父子层级；is_leaf=true 才能记账 | P1 |
| FIN-ACC-002 | 科目列表按类型过滤 | 有科目 | finance_account_list(type=ASSET) | 仅返回资产类科目 | P1 |
| FIN-VOU-001 | 新建凭证（草稿） | 存在末级科目 | finance_voucher_create(account_id[末级]+voucher_date+description+direction[DEBIT/CREDIT]+amount) | 自动生成凭证编号，状态=草稿；account_id 必须是末级科目 | P0 |
| FIN-VOU-002 | 确认凭证 | 存在草稿凭证 | finance_voucher_confirm(id) | 草稿→已确认；**确认后才参与报表计算** | P0 |
| FIN-VOU-003 | 凭证列表过滤 | 有凭证 | finance_voucher_list(按日期/科目/状态[DRAFT/CONFIRMED]) | 过滤正确 | P1 |
| FIN-REC-001 | 新建应收款 | - | finance_receivable_create(direction=RECEIVABLE+party_name+occur_date+original_amount) | 自动生成单号，状态=未结算 | P1 |
| FIN-REC-002 | 新建应付款 | - | finance_receivable_create(direction=PAYABLE+...) | 应付款生成 | P1 |
| FIN-REC-003 | 往来款部分结算 | 存在未结清往来款 | finance_receivable_settle(id+amount[本次结算额>0]) | 自动累计已结算金额；足额→已结清，不足→部分结算 | P1 |
| FIN-REC-004 | 往来款列表筛选 | 有数据 | finance_receivable_list(按方向/状态[未结算/部分/已结清]/往来方/关键词) | 过滤正确 | P1 |
| FIN-INV-001 | 新建发票（自动算税） | - | finance_invoice_create(invoice_no+invoice_type+direction[RECEIVED/ISSUED]+invoice_date+amount+tax_rate) | **自动算税额和价税合计**（amount×tax_rate） | P1 |
| FIN-INV-002 | 发票按方向/日期过滤 | 有发票 | finance_invoice_list(direction=ISSUED+start/end_date) | 结果正确 | P1 |
| FIN-RPT-001 | 资产负债表 | 有已确认凭证 | finance_balance_sheet(end_date) | 返回截至该日资产/负债/权益合计，借贷平衡 | P1 |
| FIN-RPT-002 | 利润表 | 有已确认凭证 | finance_income_statement(start_date+end_date) | 按日期范围汇总收入/成本/利润；草稿凭证不计入 | P1 |
| FIN-RPT-003 | 未确认凭证不计入报表 | 存在草稿凭证 | 对比报表与凭证总额 | 草稿凭证金额不应出现在报表中 | P2 |

---

## 十八、项目管理 PROJECT（PRJ）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| PRJ-001 | 新建项目 | - | project_create(name+manager_id+member_ids+priority+start/end_date+tags) | 项目创建，可关联合同(contract_id)/客户(customer_id) | P0 |
| PRJ-002 | 项目列表/筛选 | 有项目 | project_list(按关键词/状态[规划/进行/暂停/完成/取消]/优先级/经理) | 过滤正确 | P1 |
| PRJ-003 | 项目详情含任务 | 项目有任务 | project_get(id) | 返回项目信息 + 任务列表 | P1 |
| PRJ-004 | 更新项目进度 | 进行中项目 | project_update(id+progress[0-100]+status) | 进度/状态更新（半增量，未传字段保留原值） | P1 |
| PRJ-005 | 删除项目级联 | 项目有任务 | project_delete(id) | 删除项目同时删除其下所有任务 | P2 |
| PRJ-TASK-001 | 新建任务 | 存在项目 | project_task_create(project_id+title+assignee_id+due_date+priority) | 任务创建，状态默认待办 | P0 |
| PRJ-TASK-002 | 任务看板流转 | 存在任务 | project_task_status(id+status:待办→进行→完成/取消) | 状态变更（看板拖拽用） | P1 |
| PRJ-TASK-003 | 任务更新/删除 | 存在任务 | project_task_update(id)→project_task_delete(id) | 半增量更新生效；删除成功 | P1 |

---

## 十九、OA 办公自动化（OA）

> 覆盖站内信、公告、日程、工作日志、报销、出差、借款、会议预订、自定义表单。报销/出差/借款/表单数据可对接审批流。

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| OA-MSG-001 | 发送站内信 | 多用户 | oa_message_send(receiver_id+title+content[+content_type=text/markdown]) | 收件人收件箱出现该消息 | P1 |
| OA-MSG-002 | 收件箱/已读 | 有未读消息 | oa_message_inbox→oa_message_mark_read(id) / oa_message_read_all | 未读计数减少；单条/全部标记已读生效 | P1 |
| OA-MSG-003 | 未读计数 | 有未读 | oa_message_unread_count | 返回当前用户未读数 | P2 |
| OA-NOTICE-001 | 新建公告（草稿） | - | oa_notice_create(title+content+type[1通知/2公告]) | 默认草稿状态 | P1 |
| OA-NOTICE-002 | 发布/撤回公告 | 存在公告 | oa_notice_publish→oa_notice_withdraw | 草稿↔发布；发布后进公告流(oa_notice_feed) | P1 |
| OA-NOTICE-003 | 公告流（已发布） | 有已发布公告 | oa_notice_published / oa_notice_feed | 返回已发布公告列表 | P2 |
| OA-SCH-001 | 新建日程 | - | oa_schedule_create(title+start/end_time+event_type[MEETING/TASK/REMINDER/OUT/OTHER]+remind_type) | 日程生成，到点提醒 | P1 |
| OA-SCH-002 | 日程日历视图 | 有日程 | oa_schedule_calendar(start_date+end_date) | 返回日期范围内全部日程 | P1 |
| OA-WLOG-001 | 工作日志 CRUD | - | oa_work_log_create(log_date+content+plan+problems+log_type[DAILY/WEEKLY/MONTHLY])→update→delete | 日志生成，按日期/类型可查 | P2 |
| OA-EXP-001 | 新建报销单（含明细） | - | oa_expense_create(title+expense_type+amount+items[明细JSON]) | 报销单生成，总额自动；明细行正确 | P1 |
| OA-EXP-002 | 报销审批+打款 | 报销单已审批通过 | oa_expense_mark_paid(id) | 仅审批通过可标记已打款；状态变更 | P2 |
| OA-EXP-003 | 报销单仅未提交可改 | 已提交报销单 | oa_expense_update | 应拒绝（未提交/已驳回才可改） | P2 |
| OA-TRIP-001 | 出差申请 CRUD | - | oa_trip_create(title+destination+start/end_date+transport+budget)→update | 出差单生成 | P2 |
| OA-LOAN-001 | 借款申请 CRUD | - | oa_loan_create(title+loan_type[备用金/差旅借支/个人借款/其他]+amount+expected_date)→update | 借款单生成 | P2 |
| OA-LOAN-002 | 借款标记已还清 | 审批通过借款单 | oa_loan_mark_repaid(id) | 仅审批通过可标记；状态→已还清 | P2 |
| OA-MTG-001 | 会议室 CRUD | - | oa_meeting_room_create(name+capacity+equipment+status[ENABLED/DISABLED/MAINTENANCE]) | 会议室创建 | P2 |
| OA-MTG-002 | 会议预订（冲突检测） | 存在会议室 | oa_meeting_booking_create(title+room_id+start/end_time) | 预订成功；**同会议室时间重叠应自动检测冲突并拒绝** | P1 |
| OA-MTG-003 | 改时间重新检测冲突 | 存在预订 | oa_meeting_booking_update(改 room/time) | 重新检测冲突，有冲突则拒绝 | P2 |
| OA-FORM-001 | 新建表单模板 | - | oa_form_template_create(form_key+name+fields_config[字段JSON]+category[business/non-business]) | 模板创建，默认启用 | P2 |
| OA-FORM-002 | 用户端启用模板列表 | 有启用模板 | oa_form_template_list_enabled | 返回全部启用模板（用户端） | P2 |
| OA-FORM-003 | 提交表单数据 | 存在模板 | oa_form_data_create(template_id+field_values)→update | 表单数据生成，状态=未提交；仅未提交/已驳回可改 | P2 |
| OA-FORM-004 | 表单发起审批 | 表单数据未提交 | approval_push(对应 form_type) | 进入审批流，approval_status 流转 | P2 |

---

## 二十、知识库 KB（KB）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| KB-CAT-001 | 分类 CRUD | - | kb_category_create(name+parent_id)→update→delete | 支持父子层级；CRUD 生效 | P2 |
| KB-CAT-002 | 分类列表（authenticated） | 有分类 | kb_category_list | 有合法身份即返回（authOnly） | P2 |
| KB-DOC-001 | 新建文档 | - | kb_document_create(title+content+category_id+status[draft/published]) | 文档生成，默认 draft | P1 |
| KB-DOC-002 | 文档编辑/删除 | 存在文档 | kb_document_update(id)→delete(id) | 半增量更新；删除成功 | P1 |
| KB-DOC-003 | 文档版本历史 | 文档改过多次 | kb_document_versions(id) | 返回历史版本列表 | P2 |
| KB-DOC-004 | 恢复历史版本 | 存在历史版本 | kb_document_restore(id+version_id) | 文档回滚到指定版本 | P2 |

---

## 二十一、网盘 CLOUD（CLOUD）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| CLOUD-FOLDER-001 | 新建文件夹 | - | cloud_folder_create(name+parent_id[0=根]+scope[personal/dept/public]) | 文件夹生成 | P2 |
| CLOUD-FILE-001 | 文件元数据落库 | 已上传得到 URL | cloud_file_create(name+url+parent_id+scope+size+object_key) | 文件记录生成（上传走上传接口，此处只存元数据） | P2 |
| CLOUD-FILE-002 | 文件列表/移动/重命名 | 有文件 | cloud_file_list(parent_id+scope)→cloud_file_update(id+name/parent_id) | 按 scope/父目录列出；移动/重命名生效 | P2 |
| CLOUD-FILE-003 | 删除文件（递归） | 文件夹有子项 | cloud_file_delete(id) | 文件夹递归删除 | P2 |
| CLOUD-USAGE-001 | 个人空间用量 | - | cloud_usage | 返回个人空间已用/总量 | P2 |

---

## 二十二、定时任务 ENTERPRISE（JOB）

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| JOB-001 | 新建定时任务 | 已注册处理器 | enterprise_job_create(job_name+cron_expression[6段式:秒分时日月周]+bean_class+status[0暂停/1运行]) | 任务创建 | P2 |
| JOB-002 | 手动触发一次 | 存在任务 | enterprise_job_run(id) | **立即异步执行**一次，不等待结果；执行日志产生 | P2 |
| JOB-003 | 任务更新/启停 | 存在任务 | enterprise_job_update(id+status/cron) | 状态/cron 变更生效 | P2 |
| JOB-004 | 执行日志查询 | 有执行记录 | enterprise_job_log_list(可按 job_id) | 返回任务执行日志，可分页 | P2 |

---

## 二十三、公共能力（COMM）

> 跨模块基础能力：附件、统一日历、私有文件签名、OSS 直传凭证。多数挂在 authenticated 组。

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| COMM-ATT-001 | 附件 CRUD | 已上传文件 | attachment_create(biz_type+resource_id+file_name+url)→attachment_list→delete | 附件按 biz_type+resource_id 关联；CRUD 生效 | P2 |
| COMM-CAL-001 | 统一日历聚合 | 有各业务待办 | calendar(start_date+end_date[+sources 逗号分隔]) | 聚合 schedule/followup/opportunity/payment/meeting/trip/task/receivable 等带日期待办，仅返回当前用户的 | P1 |
| COMM-FILE-001 | 私有文件签名下载 | 存在私有文件 objectKey | file_sign(key) | 签发短期(1小时)下载 URL，无需 Authorization header | P2 |
| COMM-FILE-002 | OSS 直传预签名 | - | file_upload_sts(filename[+folder+private]) | 返回预签名 URL，前端可直接 PUT 到 OSS | P2 |

---

## 二十四、MCP 认证与操作级权限机制（MCP-CORE）

> 本章验证 MCP 协议层独有的安全机制，HTTP 接口层不涉及。**测试入口**：`POST /mcp`（生产 `https://devlovecode.com/mcp`），Streamable HTTP transport，`Authorization: Bearer qzt_xxx`。
> 三道闸门：① API Key 认证（mcpAuthMiddleware）→ ② 工具操作级权限（mcpPermissionMiddleware，见 `perm_check.go`）→ ③ 业务 handler。
> 核心规则：**未在 `toolPermMap` 登记的工具默认拒绝**；`authOnlyTools` 命中的工具仅需合法身份；super_admin 绕过 Casbin；其余走 Casbin（角色需在后台分配对应 HTTP API 权限）。

| 编号 | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|------|---------|---------|---------|---------|--------|
| MCP-AUTH-001 | API Key 合法认证 | 已生成 qzt_ 前缀 API Key | 带 `Authorization: Bearer qzt_xxx` 调 tools/call（如 crm_customer_list） | 认证通过，正常返回工具结果 | P0 |
| MCP-AUTH-002 | 缺少认证信息 | - | 不带 Authorization 头调 /mcp | 返回 401「缺少认证信息」 | P0 |
| MCP-AUTH-003 | 认证格式错误 | - | Authorization 值非「Bearer xxx」格式 | 返回 401「认证格式错误」 | P1 |
| MCP-AUTH-004 | 非 API Key 被拒 | - | 用普通 JWT（无 qzt_ 前缀）调 /mcp | 返回 401「MCP 仅支持 API Key 认证(qzt_ 前缀)」 | P0 |
| MCP-AUTH-005 | API Key 关联用户禁用 | API Key 对应用户 status≠1 | 用该 Key 调任意工具 | 返回 403「API Key 关联的用户已禁用」 | P1 |
| MCP-PERM-001 | 未登记工具默认拒绝 | 临时注册一个不在 perm_map 的工具 | 非超管用户调用该工具 | 返回错误「工具 xxx 未配置权限映射,已拒绝」 | P0 |
| MCP-PERM-002 | authOnly 工具放行 | 普通（非超管）用户 | 调 authOnly 工具（如 dashboard_overview / oa_message_inbox / site_config_get / psi_stock_list） | 仅凭合法身份即放行，不走 Casbin | P0 |
| MCP-PERM-003 | super_admin 绕过 Casbin | super_admin 角色用户的 API Key | 调任意已登记工具（含未在后台授权 API 的） | 全部放行，不受 Casbin 限制 | P0 |
| MCP-PERM-004 | 普通角色需 Casbin 授权 | 普通角色未在后台分配对应 API | 调非 authOnly 工具（如 crm_customer_create） | 返回「无权限调用…(需要 POST /crm/customers)」 | P0 |
| MCP-PERM-005 | 普通角色已授权放行 | 角色已在后台分配对应 HTTP API 权限 | 调该工具 | Casbin Enforce 通过，正常执行 | P1 |
| MCP-PERM-006 | 多角色任一通过即放行 | 用户有角色 A(无权)+B(有权) | 调 B 有权工具 | 任一角色通过即放行（与 HTTP CasbinRBAC 一致） | P1 |
| MCP-PERM-007 | 权限映射与 HTTP 共享策略 | - | 对比 MCP 工具 perm_map 的 path/method 与 sys_api/Casbin 策略 | 工具权限点 = 对应 HTTP 接口的 Casbin 策略，同一份策略双重生效 | P1 |
| MCP-PERM-008 | 新增工具维护规则（回归） | 新增了 MCP 工具 | 全量调用遍历 | **每个新增工具必须在 perm_map.go 登记**（或 authOnlyTools），否则对非超管全部拒绝——这是防遗漏的硬约束 | P1 |

---

## 附：测试执行记录模板（给点点测试员用）

| 用例编号 | 页面/模块 | 是否通过(✅/❌/⚠️) | 问题描述/优化建议 | 截图 | 备注 |
|---------|----------|------------------|------------------|------|------|
| CRM-CUS-001 | 客户管理 | | | | |
| APR-002 | 合同审批 | | | | |
| ... | | | | | |

> 说明：每天至少测 25 个页面，**每个页面至少给 1 条反馈**（问题或优化建议均可，全填"通过"不计入工作量）。问题类附截图+一句话描述；优化类写清"哪里不顺手/建议怎么改"。
