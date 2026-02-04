# 企账通后端功能完善设计文档

**日期**: 2025-02-04
**版本**: 1.0.0
**状态**: 待实施

## 一、自动化规则引擎完善

### 1.1 当前问题
- 条件树评估只实现了简单的OR逻辑，不支持AND/OR嵌套
- 缺少括号优先级处理
- 工作流执行器的消息发送是TODO

### 1.2 设计方案

#### 条件树数据结构重构
- 支持嵌套的条件组（AND/OR逻辑）
- 使用递归算法评估条件树
- 支持操作符：`=`, `!=`, `>`, `<`, `>=`, `<=`, `IN`, `LIKE`, `BETWEEN`
- 支持字段嵌套访问（如：`customer.name`）

#### 工作流动作类型扩展
- **RECORD_ADD**: 添加记录（跟进记录、通知等）
- **RECORD_UPDATE**: 更新记录（客户状态、合同状态等）
- **MESSAGE**: 发送消息（集成Webhook服务）
- **WEBHOOK**: 自定义HTTP请求
- **EMAIL**: 发送邮件（预留）

#### 触发机制优化
- **DATA_ADD**: 数据创建时触发
- **DATA_UPDATE**: 数据更新时触发
- **TIME_CONDITION**: 满足时间条件时触发
- **SCHEDULED**: 定时触发（通过Cron表达式）

#### 执行日志增强
- 记录条件评估过程
- 记录每个工作流的执行结果
- 支持重试机制（失败自动重试）

### 1.3 文件清单
- `src/modules/rule-engine/services/rule-engine.service.ts` - 完善条件树评估
- `src/modules/rule-engine/services/workflow-executor.service.ts` - 集成消息发送
- `src/modules/rule-engine/dto/condition.dto.ts` - 条件树DTO

---

## 二、产品流程执行引擎

### 2.1 当前问题
- 流程节点只有基础框架，缺少实际业务逻辑
- 周期性节点的cron配置未实际使用
- 缺少节点执行状态跟踪

### 2.2 设计方案

#### 节点类型完善

**通知节点（NOTIFY）**
- 根据节点配置的`roleId`找到对应的用户
- 创建系统内Notification记录
- 如果启用了Webhook，同步发送到企业微信/钉钉/飞书
- 支持模板变量替换（如：`{客户名称}`、`{合同金额}`）

**任务节点（TASK）**
- 执行预定义的系统操作
- 支持操作：更新合同状态、更新客户级别、创建跟进任务
- 可扩展自定义任务类型
- 记录任务执行日志

#### 流程执行策略
- **一次性节点（NODE）**: 执行一次后标记完成
- **周期性节点（CYCLE）**: 根据cron表达式重复执行
- **顺序执行**: 按order字段顺序依次执行
- **并行执行**: 相同order的节点并行执行

#### 执行状态管理
- **PENDING**: 待执行
- **RUNNING**: 执行中
- **SUCCESS**: 成功
- **FAILED**: 失败（记录错误原因）
- **SKIPPED**: 跳过（前置条件不满足）

#### 异常处理
- 执行失败自动重试（最多3次）
- 失败后发送告警通知
- 支持手动重新执行

### 2.3 文件清单
- `src/modules/scheduler/scheduler.service.ts` - 完善节点执行逻辑
- `src/modules/product/product-flow.service.ts` - 新增流程管理服务
- `src/modules/product/dto/flow-execution.dto.ts` - 流程执行DTO

---

## 三、新媒体多平台发布集成

### 3.1 当前问题
- 令牌刷新逻辑未实现（TODO）
- 缺少实际的平台API对接
- 没有多平台同时发布功能
- 定时发布功能不完整

### 3.2 设计方案

#### 平台令牌管理

**令牌自动刷新**
- 检测令牌过期时间，提前1小时自动刷新
- 调用各平台OAuth接口刷新access_token
- 刷新失败时发送告警通知
- 记录令牌刷新历史日志

**支持的开放平台**
- 抖音开放平台（DOUYIN）
- 小红书开放平台（XIAOHONGSHU）
- 微信公众号/视频号（WECHAT）

#### 内容发布功能

**单平台发布**
- 上传视频到OSS获取URL
- 调用平台API上传视频素材
- 提交发布请求（标题、文案、话题、位置等）
- 获取平台返回的内容ID和链接
- 更新`SocialMediaPublishLog`状态

**多平台同时发布**
- 批量调用多个平台的发布API
- 每个平台独立记录发布日志（`SocialMediaPublishLog`）
- 部分平台失败不影响其他平台
- 返回汇总结果（成功数、失败数、详情）

#### 定时发布
- 创建时状态为`scheduled`
- Scheduler定时任务每分钟检查待发布内容
- 到达发布时间自动触发发布流程
- 发布成功后更新状态和`publishedAt`

#### 发布状态跟踪
- **draft**: 草稿
- **scheduled**: 定时中
- **publishing**: 发布中
- **published**: 已发布
- **failed**: 失败（记录错误信息）
- 支持失败后重新发布

### 3.3 文件清单
- `src/modules/social-media/services/social-media-account.service.ts` - 完善令牌刷新
- `src/modules/social-media/services/social-media-publisher.service.ts` - 新增发布服务
- `src/modules/social-media/providers/douyin.provider.ts` - 抖音API对接
- `src/modules/social-media/providers/xiaohongshu.provider.ts` - 小红书API对接
- `src/modules/social-media/providers/wechat.provider.ts` - 微信API对接

---

## 四、在线支付集成完善

### 4.1 当前问题
- 证书/密钥管理是TODO
- 缺少沙箱/生产环境切换
- 缺少支付配置的CRUD接口
- 证书文件路径管理不明确

### 4.2 设计方案（支持多种部署场景）

#### 多支付渠道架构

**已实现的支付提供者**
- WechatPayProvider（微信支付）
- AlipayProvider（支付宝）
- BankTransferProvider（银行转账 - 手动确认）

**预留扩展接口**
- 其他第三方支付（如：通联、汇付等）
- 虚拟币支付（如需要）
- 线下支付（现金、支票）

#### 灵活的部署模式

**生产模式**
- 配置真实的证书和密钥
- 对接真实支付网关
- 完整的签名验证和回调处理

**测试模式**
- 无需证书即可运行
- 使用模拟支付提供者
- 支持手动标记订单为"已支付"（用于测试）
- 回调接口可跳过签名验证（仅测试环境）

**离线模式**
- 只创建订单记录
- 不生成真实支付二维码
- 完全依赖线下收款后手动确认

#### 配置管理策略

**支付配置（PaymentConfig表）**
- 支持多种支付方式并存
- 每种支付方式可有多个配置（不同商户号）
- 配置项：
  - paymentMethod: wechat/alipay/bank
  - paymentChannel: 具体渠道
  - environment: sandbox/production/mock
  - enabled: 是否启用
  - **所有证书字段都是可选的**

**降级策略**
- 找不到证书时自动切换到测试模式
- 证书过期时发送告警但继续提供服务
- 支付接口调用失败时降级为手动确认模式

#### 测试友好功能

**MockPaymentProvider**
- 模拟生成支付二维码（返回测试二维码）
- 提供测试接口直接完成支付（仅测试环境）
- 支持模拟各种支付状态（成功、失败、超时）
- 不需要任何证书和密钥

**开发工具**
```
POST /api/payment-orders/test-pay/:orderNo
- 测试环境专用
- 直接将订单标记为已支付
- 跳过真实的支付流程
```

#### 证书部署流程

**开发/测试阶段**
```bash
# 无需证书，使用Mock模式
PAYMENT_MODE=mock
```

**生产环境部署**
```bash
# 1. 上传证书文件到服务器
mkdir -p /opt/qzt/certificates/wechat/production/
mkdir -p /opt/qzt/certificates/alipay/production/

# 2. 复制证书文件并设置权限
chmod 600 /opt/qzt/certificates/*/*
chown app:app /opt/qzt/certificates/*/*

# 3. 配置环境变量
PAYMENT_MODE=production
WECHAT_CERT_PATH=/opt/qzt/certificates/wechat/production
ALIPAY_CERT_PATH=/opt/qzt/certificates/alipay/production

# 4. 重启应用
npm run start:prod
```

### 4.3 文件清单
- `src/modules/payment-order/services/payment-providers/mock.provider.ts` - 新增模拟支付
- `src/modules/payment-order/services/certificate.service.ts` - 新增证书管理服务
- `src/modules/payment-order/controllers/test.controller.ts` - 新增测试接口
- `certificates/` - 证书存储目录

---

## 五、Webhook通知集成完善

### 5.1 当前状态
- WebhooksService已经实现（支持企业微信、钉钉、飞书）
- 其他模块中有多处TODO标记需要发送Webhook

### 5.2 设计方案

#### 创建全局Webhook服务
- **位置**: `src/common/services/webhook.service.ts`
- 作为全局服务，所有模块都可注入使用
- 封装消息发送逻辑
- 自动处理失败重试

#### 集成点

**产品流程节点触发时**
- 通知节点执行时发送Webhook
- 任务节点失败时发送告警
- 流程执行完成时发送通知

**自动化规则触发时**
- 规则执行成功时
- 规则执行失败时
- 关键业务事件触发时

**支付事件**
- 订单支付成功
- 订单支付失败
- 退款完成

**合同事件**
- 合同即将到期（30天、7天、1天）
- 新合同创建
- 合同状态变更

#### 消息模板管理

**模板存储**
- 数据库表：`WebhookTemplate`
- 字段：code, name, platform, content（支持变量替换）
- 预置常用模板

**变量替换**
```javascript
// 模板内容
"客户【{customerName}】的合同【{contractNo}】即将到期"

// 替换后
"客户【某某公司】的合同【HT202501001】即将到期"
```

**常用变量**
- {customerName}: 客户名称
- {contractNo}: 合同编号
- {amount}: 金额
- {date}: 日期
- {url}: 跳转链接

#### 发送策略

**优先级队列**
- **紧急**: 立即发送
- **普通**: 批量发送（每5分钟一批）
- **低优先级**: 定时发送（每小时一次）

**失败处理**
- 自动重试3次（指数退避）
- 3次仍失败则记录为失败
- 失败的记录可在管理界面手动重发

#### 管理功能

**Webhook配置管理**
- 创建/编辑/删除Webhook配置
- 启用/禁用配置
- 测试发送（用于验证配置）

**发送记录查询**
- 查看发送历史
- 按状态筛选（成功/失败）
- 查看失败原因
- 手动重新发送

### 5.3 文件清单
- `src/common/services/webhook.service.ts` - 全局Webhook服务
- `src/modules/webhooks/webhook-template.service.ts` - 模板管理服务
- `prisma/schema.prisma` - 新增WebhookTemplate模型

---

## 六、API版本管理（简化版）

### 6.1 需求
- 单体项目，内部使用
- 版本号用日期：`2025.02.04.1`
- 打包交付时标记版本

### 6.2 设计方案

#### 版本号格式
**格式**: `YYYY.MM.DD.构建次数`
- 示例：`2025.02.04.1`（今天第1次构建）
- 示例：`2025.02.04.2`（今天第2次构建）

#### 自动版本管理

**构建脚本**
```json
{
  "scripts": {
    "build": "nest build && node scripts/update-version.js",
    "version:patch": "node scripts/bump-version.js"
  }
}
```

**版本更新逻辑**
- 读取当前版本号
- 如果日期相同，构建次数+1
- 如果日期不同，重置为.1
- 更新package.json和main.ts

#### Swagger配置

**显示版本信息**
```typescript
// main.ts
const packageJson = require('../package.json');
const config = new DocumentBuilder()
  .setTitle('企账通SCRM API')
  .setDescription(`企账通SCRM系统API文档<br/>版本: ${packageJson.version}<br/>构建时间: ${new Date().toISOString()}`)
  .setVersion(packageJson.version)
  .build();
```

**访问地址**
- `http://localhost:7890/api-docs`
- 文档头部显示当前版本和构建时间

#### 变更记录（简化版）

**CHANGELOG.md（自动生成）**
```markdown
# API 变更记录

## [2025.02.04.1] - 2025-02-04
- 新增产品流程执行功能
- 优化自动化规则引擎
- 修复支付回调问题

## [2025.02.03.2] - 2025-02-03
- 新增新媒体多平台发布
- 修复客户查询bug
```

**生成方式**
- 从Git提交信息自动提取
- 手动记录重要变更

#### 交付打包

**打包脚本**
```bash
npm run build
npm run package  # 生成 qzt-backend-2025.02.04.1.tar.gz
```

**包内容**
```
qzt-backend-2025.02.04.1/
├── dist/
├── prisma/
├── package.json
├── CHANGELOG.md
├── .env.production.example
└── README.md (部署说明)
```

#### 版本查询接口

**简单接口**
```
GET /api/version
Response: {
  "version": "2025.02.04.1",
  "buildTime": "2025-02-04T10:30:00Z",
  "gitCommit": "1a2b3c4d"
}
```

### 6.3 文件清单
- `scripts/update-version.js` - 版本更新脚本
- `scripts/bump-version.js` - 手动版本号升级脚本
- `scripts/package.js` - 打包脚本
- `src/main.ts` - 添加版本信息到Swagger
- `CHANGELOG.md` - 变更日志

---

## 七、实施计划

### 优先级排序
1. **P0（核心功能）**: 自动化规则引擎、产品流程执行
2. **P1（重要功能）**: Webhook通知集成、在线支付集成
3. **P2（增强功能）**: 新媒体多平台发布、API版本管理

### 预估工作量
- 自动化规则引擎: 2-3天
- 产品流程执行: 2天
- Webhook通知集成: 1天
- 在线支付集成: 2天
- 新媒体多平台发布: 3天
- API版本管理: 0.5天

**总计**: 约10-12天

### 实施顺序
1. 先实施API版本管理（基础设施）
2. 实施Webhook通知集成（其他功能依赖）
3. 实施自动化规则引擎和产品流程执行（核心业务）
4. 实施在线支付集成（外部依赖多，需测试）
5. 最后实施新媒体发布（独立功能）

---

## 八、验收标准

### 自动化规则引擎
- ✅ 支持AND/OR嵌套条件
- ✅ 条件评估结果准确
- ✅ 工作流执行日志完整

### 产品流程执行
- ✅ 通知节点正确发送通知
- ✅ 任务节点正确执行操作
- ✅ 周期性节点按cron执行
- ✅ 执行失败自动重试

### 新媒体发布
- ✅ 令牌自动刷新
- ✅ 单平台发布成功
- ✅ 多平台同时发布
- ✅ 定时发布准确触发

### 在线支付
- ✅ Mock模式正常工作
- ✅ 生产模式证书正确加载
- ✅ 支付回调处理正确
- ✅ 降级策略生效

### Webhook集成
- ✅ 全局服务可注入
- ✅ 消息发送成功
- ✅ 模板变量正确替换
- ✅ 失败重试机制有效

### API版本管理
- ✅ 版本号自动更新
- ✅ Swagger显示版本
- ✅ 打包文件名包含版本
- ✅ CHANGELOG正确生成

---

## 九、风险与注意事项

### 技术风险
1. **支付接口稳定性**: 需要充分测试Mock模式和生产模式切换
2. **第三方API限制**: 新媒体平台可能有调用频率限制
3. **证书管理**: 生产环境证书安全需要特别注意

### 业务风险
1. **流程执行失败**: 需要完善的错误处理和重试机制
2. **通知延迟**: Webhook发送可能延迟，需要异步处理
3. **版本兼容**: 确保前端能够适配API变更

### 建议
1. 优先在测试环境充分验证
2. 逐步上线，先小范围试运行
3. 做好回滚准备
4. 完善监控和日志

---

**文档版本**: 1.0.0
**最后更新**: 2025-02-04
