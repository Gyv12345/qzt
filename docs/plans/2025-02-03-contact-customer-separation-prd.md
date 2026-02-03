# 企账通数据模型重构 PRD：Customer 与 Contact 分离

## 一、背景与问题

### 1.1 业务本质

代理记账公司的服务对象是**公司**，而非个人。现有模型混淆了"公司"和"联系人"两个概念：

- **Customer** 应该代表"公司/企业"（付费主体）
- **Contact** 代表"具体联系人"（沟通对象）

### 1.2 当前问题

1. 概念混乱：Customer 同时存储公司和联系人信息
2. 关系限制：一个公司只能有一个联系人
3. 业务逻辑错误：签约前添加的应该是"联系人"，签约后才成为"客户"
4. 现实场景缺失：一个采购负责人可能对接多家公司

### 1.3 业务流程澄清

```
┌─────────────┐     签约付款     ┌─────────────┐
│  Contact    │  ────────────→  │  Customer   │
│  (联系人)   │                 │  (公司客户)  │
└─────────────┘                 └─────────────┘
     初期添加                       正式客户
```

**关键规则：**
- 初期添加的都是 Contact（联系人）
- 只有签约付款的，才晋升为 Customer（客户）
- Customer 必定是公司
- 一个 Contact 可以关联多个 Customer

---

## 二、数据模型设计

### 2.1 概念关系图

```
┌──────────────────┐         ┌──────────────────────┐         ┌──────────────────┐
│     Contact      │────────▶│  CustomerContact     │◀────────│     Customer      │
│   (联系人)       │  1:N    │   (客户联系人关联)    │   N:1   │    (公司/客户)    │
│                  │         │                      │         │                  │
│ - name (姓名)    │         │ - isPrimary (主联系人)│        │ - name (公司名)   │
│ - phone (电话)   │         │ - isDecision (决策人) │        │ - industry (行业) │
│ - email (邮箱)   │         │ - position (职位)     │        │ - level (客户等级)│
│ - wechat (微信)  │         │ - relation (关系)     │        │ - contractDate   │
└──────────────────┘         └──────────────────────┘         └──────────────────┘
                                                                      │
                                                                      │ N:1
                                                                      ▼
                                                              ┌───────────────┐
                                                              │    Contract   │
                                                              │   (合同)      │
                                                              └───────────────┘
```

### 2.2 Customer 模型（公司/客户）

```prisma
model Customer {
  id               String   @id @default(cuid())
  name             String   // 公司名称（必填）
  shortName        String?  // 公司简称
  code             String?  @unique // 公司编码（外部系统对接）
  industry         String?  // 行业
  scale            String?  // 规模：1-10人, 11-50人, 51-200人, 201-500人, 500人+
  address          String?  // 公司地址
  website          String?  // 公司网站

  // 客户状态
  customerLevel    Int      @default(0) // 0:线索公司 1:意向客户 2:正式客户 3:VIP客户
  sourceChannel    String?  // 来源渠道
  followUserId     String?  // 跟进人ID

  // 时间节点
  firstContactDate DateTime? // 首次联系时间
  contractDate     DateTime? // 签约时间（晋升为正式客户的时间）

  // 其他
  tags             String?  // 标签(JSON数组)
  remark           String?  // 备注
  status           Int      @default(1) // 1:启用 0:禁用
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // 关联
  contracts           Contract[]
  followRecords       FollowRecord[]
  invoices            Invoice[]
  serviceTeams        ServiceTeam[]
  contacts            CustomerContact[]  // 多对多
  assignmentHistories CustomerAssignmentHistory[]
  followUser          User? @relation("CustomerFollowUser", ...)

  @@index([followUserId])
  @@index([customerLevel])
  @@index([status])
  @@index([contractDate])
  @@map("customers")
}
```

### 2.3 Contact 模型（联系人）

```prisma
model Contact {
  id         String   @id @default(cuid())
  name       String   // 联系人姓名
  phone      String   @unique // 联系电话（唯一，便于识别）
  email      String?  // 联系邮箱
  wechat     String?  // 微信号
  position   String?  // 职位（通用）
  department String?  // 部门（通用）
  avatar     String?  // 头像
  birthdate  DateTime? // 生日
  tags       String?  // 标签(JSON数组)
  remark     String?  // 备注
  status     Int      @default(1) // 1:启用 0:禁用
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // 关联
  customerContacts CustomerContact[]  // 多对多
  followRecords    FollowRecord[]

  @@index([phone])
  @@index([status])
  @@map("contacts")
}
```

### 2.4 CustomerContact 模型（关联表）

```prisma
model CustomerContact {
  id         String   @id @default(cuid())
  customerId String   // 公司ID
  contactId  String   // 联系人ID

  // 该联系人在这家公司的角色
  isPrimary  Boolean  @default(false) // 是否主要联系人
  isDecision Boolean  @default(false) // 是否决策人
  department String?  // 在该公司的部门
  position   String?  // 在该公司的职位
  relation   String?  // 与公司关系（法人/股东/采购负责人/财务等）
  tags       String?  // 标签
  remark     String?  // 备注
  status     Int      @default(1) // 1:在职 0:已离职

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  contact    Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@unique([customerId, contactId])  // 防止重复关联
  @@index([customerId])
  @@index([contactId])
  @@map("customer_contacts")
}
```

### 2.5 FollowRecord 模型调整

```prisma
model FollowRecord {
  id         String   @id @default(cuid())
  customerId String   // 公司ID（必填）
  contactId  String?  // 联系人ID（可选，针对具体联系人的跟进）
  userId     String
  type       Int      // 1:电话 2:微信 3:上门 4:邮件 5:其他
  content    String
  nextTime   DateTime?
  images     String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  customer   Customer @relation(...)
  contact    Contact?  @relation(...)  // 新增：可关联具体联系人
  user       User?    @relation(...)

  @@index([customerId])
  @@index([contactId])
  @@index([userId])
  @@map("follow_records")
}
```

---

## 三、业务流程

### 3.1 新增联系人流程

```
1. 用户输入：姓名 + 电话
2. 系统检查：
   - phone 是否已存在？
   - 存在 → 复用已有 Contact，直接关联公司
   - 不存在 → 创建新 Contact
3. （可选）选择关联公司
   - 选择已有公司 → 创建 CustomerContact 关联
   - 创建新公司 → 先创建 Customer（level=0），再关联
```

### 3.2 晋升为客户流程

```
触发条件：签约 + 付款

Contact（已有） ──签约──▶ Customer.contractDate = today
                         Customer.customerLevel = 2
```

### 3.3 一个联系人多家公司场景

```
张三（采购负责人）
    │
    ├──▶ A公司（主要联系人、决策人）
    ├──▶ B公司（普通联系人）
    └──▶ C公司（决策人）
```

---

## 四、前端交互设计

### 4.1 联系人列表页（入口）

| 字段 | 说明 |
|------|------|
| 姓名 | Contact.name |
| 电话 | Contact.phone |
| 所属公司 | 聚合显示关联的所有公司 |
| 最近跟进 | FollowRecord 最新时间 |
| 操作 | 编辑、删除、查看详情 |

### 4.2 联系人详情页

**头部信息：**
- 联系人基础信息（姓名、电话、邮箱、微信等）
- 所属公司列表（卡片展示）

**公司卡片内容：**
- 公司名称
- 在该公司的角色（职位、是否决策人）
- 该公司的状态（线索/意向/正式/VIP）

### 4.3 公司列表页

| 字段 | 说明 |
|------|------|
| 公司名称 | Customer.name |
| 客户等级 | 0:线索 1:意向 2:正式 3:VIP |
| 联系人数量 | CustomerContact 关联数量 |
| 主要联系人 | isPrimary=true 的 Contact |
| 跟进人 | User.name |
| 签约时间 | Customer.contractDate |

### 4.4 新增/编辑联系人弹窗

```
┌─────────────────────────────────────┐
│ 新增联系人                          │
├─────────────────────────────────────┤
│                                     │
│ 姓名 *      [___________]           │
│ 电话 *      [___________]           │
│ 邮箱        [___________]           │
│ 微信        [___________]           │
│                                     │
│ 关联公司    [+ 选择已有] [+ 创建新]  │
│ ┌───────────────────────────────┐  │
│ │ A公司 │ 主要联系人 □ 决策人 □  │  │
│ │ [移除]                       │  │
│ └───────────────────────────────┘  │
│ ┌───────────────────────────────┐  │
│ │ B公司 │ 主要联系人 ☑ 决策人 ☑  │  │
│ │ [移除]                       │  │
│ └───────────────────────────────┘  │
│                                     │
│ 备注        [_______________]       │
│                                     │
│          [取消]      [保存]         │
└─────────────────────────────────────┘
```

---

## 五、API 设计

### 5.1 Contact API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /contacts | 联系人列表（支持分页、搜索、公司筛选） |
| GET | /contacts/:id | 联系人详情（含关联公司） |
| POST | /contacts | 创建联系人 |
| PUT | /contacts/:id | 更新联系人 |
| DELETE | /contacts/:id | 删除联系人 |
| POST | /contacts/:id/companies | 关联公司 |
| DELETE | /contacts/:id/companies/:companyId | 取消关联 |

### 5.2 Customer API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /customers | 公司列表（支持分页、搜索、等级筛选） |
| GET | /customers/:id | 公司详情（含关联联系人） |
| POST | /customers | 创建公司 |
| PUT | /customers/:id | 更新公司 |
| DELETE | /customers/:id | 删除公司 |
| POST | /customers/:id/contacts | 关联联系人 |
| PUT | /customers/:id/level | 更新客户等级 |
| POST | /customers/:id/convert | 晋升为正式客户 |

---

## 六、实施步骤

### Phase 1: 数据模型（1天）
- [x] 更新 schema.prisma
- [ ] 生成 Prisma 客户端
- [ ] 创建数据库迁移

### Phase 2: 后端开发（2天）
- [ ] Contact 模块（CRUD + 关联公司）
- [ ] Customer 模块调整
- [ ] CustomerContact 模块
- [ ] FollowRecord 调整

### Phase 3: 前端开发（3天）
- [ ] 联系人列表/详情页
- [ ] 公司列表/详情页
- [ ] 新增联系人弹窗（支持多公司关联）
- [ ] 重新生成 API

### Phase 4: 测试（1天）
- [ ] 单元测试
- [ ] 集成测试
- [ ] UI 测试

---

## 七、关键决策记录

| 决策 | 理由 |
|------|------|
| Customer 保留表名，不改为 Company | 减少关联表的大规模修改，对外概念仍是"客户" |
| Contact.phone 唯一索引 | 便于识别去重，同一人无论关联几家公司都是同一条 Contact |
| CustomerContact 使用独立关联表 | 支持多对多，且可存储在特定公司的角色信息 |
| FollowRecord 同时关联 Customer 和 Contact | 跟进可以针对公司，也可以针对具体联系人 |
| isPrimary/isDecision 放在关联表 | 同一人在不同公司角色不同 |
