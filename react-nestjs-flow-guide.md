# 🚀 React + NestJS 工作流流程引擎落地实战指南

> 目标：  
> 用 **React Flow（前端可视化） + NestJS（后端流程引擎）**  
> 实现一个：可拖拽编排 + 可执行 + 可持久化 + 可和业务解耦 的流程系统

适合人群：
- 后端强（Java / Nest / Spring 思维）
- 想做审批流 / 任务流 / 编排流 / AI Flow / 自动化
- 不想引入 Flowable / Camunda 这种重型怪物

一句话结论：

👉 **流程只负责调度，业务逻辑全部放 Service**

---

---

# 📦 一、整体架构

```
React Flow (画图)
        ↓
Flow JSON (流程定义)
        ↓
NestJS Flow Engine (执行器)
        ↓
Business Service (订单/审批/任务)
        ↓
MySQL
```

职责分工：

| 层 | 作用 |
|-------|--------|
| React | 画图 + 保存 |
| NestJS Flow | 调度流程 |
| Service | 真正业务逻辑 |
| DB | 持久化 |

---

---

# 📦 二、前端（React + React Flow）

## 安装

```bash
npm i reactflow
```

---

## 最小示例

```tsx
import ReactFlow from 'reactflow';
import 'reactflow/dist/style.css';

export default function FlowEditor({ nodes, edges }) {
  return (
    <div style={{ height: 600 }}>
      <ReactFlow nodes={nodes} edges={edges}/>
    </div>
  );
}
```

---

## 保存流程

```ts
await fetch('/api/flow/define', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(graph)
});
```

---

## 推荐 JSON 结构

```json
{
  "nodes": [
    { "id": "start", "type": "start" },
    { "id": "approve", "type": "serviceTask", "service": "orderService.approve" },
    { "id": "end", "type": "end" }
  ],
  "edges": [
    { "source": "start", "target": "approve" },
    { "source": "approve", "target": "end" }
  ]
}
```

---

---

# 📦 三、数据库设计（核心）

## flow_definition（流程模板）

```sql
CREATE TABLE flow_definition (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100),
  graph_json LONGTEXT,
  version INT,
  create_time DATETIME
);
```

---

## flow_instance（流程实例）

```sql
CREATE TABLE flow_instance (
  id BIGINT PRIMARY KEY,
  definition_id BIGINT,
  business_id BIGINT,
  status VARCHAR(20),
  current_node VARCHAR(50)
);
```

---

## flow_task（待办任务）

```sql
CREATE TABLE flow_task (
  id BIGINT PRIMARY KEY,
  instance_id BIGINT,
  node_id VARCHAR(50),
  assignee VARCHAR(50),
  status VARCHAR(20)
);
```

---

---

# 📦 四、NestJS 流程引擎实现

## DTO

```ts
export class StartFlowDto {
  definitionId: number;
  businessId: number;
}
```

---

## Controller

```ts
@Controller('flow')
export class FlowController {

  constructor(private readonly service: FlowEngineService) {}

  @Post('start')
  start(@Body() dto: StartFlowDto) {
    return this.service.start(dto);
  }

  @Post('step')
  step(@Body('instanceId') id: number) {
    return this.service.step(id);
  }
}
```

---

---

# 📦 五、核心：流程执行器

## Service Registry（注册业务方法）

```ts
@Injectable()
export class FlowServiceRegistry {

  constructor(private orderService: OrderService) {}

  get(name: string) {
    const map = {
      'orderService.approve': this.orderService.approve.bind(this.orderService),
    };
    return map[name];
  }
}
```

---

## Flow Engine

```ts
@Injectable()
export class FlowEngineService {

  constructor(private registry: FlowServiceRegistry) {}

  async runNode(node, context) {
    if (node.type === 'serviceTask') {
      const fn = this.registry.get(node.service);
      await fn(context.businessId);
    }
  }
}
```

---

---

# 📦 六、业务层写法（重点）

## ❌ 错误写法

流程里写 SQL / 业务逻辑

---

## ✅ 正确写法

```ts
@Injectable()
export class OrderService {

  async approve(orderId: number) {
    // 只写业务
    await this.repo.update(orderId, { status: 'APPROVED' });
  }
}
```

流程只负责：

👉 调用这个方法

---

---

# 📦 七、完整 API 设计

## 启动流程

```
POST /flow/start
```

```json
{
  "definitionId": 1,
  "businessId": 1001
}
```

---

## 推进流程

```
POST /flow/step
```

---

## 查询待办

```
GET /flow/todo?userId=xxx
```

---

---

# 📦 八、典型业务整合示例（审批流）

## 创建订单

```
orderService.create()
flow.start()
```

## 审批

```
点击按钮 -> flow.step()
```

## 自动执行

```
节点 -> 调用 orderService.approve()
```

---

---

# 📦 九、推荐目录结构

```
src
 ├─ flow
 │   ├─ engine
 │   ├─ registry
 │   ├─ controller
 │   ├─ entity
 ├─ order
 │   ├─ order.service.ts
 │   ├─ order.controller.ts
```

---

---

# 📦 十、部署（CentOS）

## Dockerfile

```dockerfile
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["node","dist/main.js"]
```

---

## docker-compose

```yaml
services:
  flow:
    build: .
    ports:
      - "3000:3000"
```

---

---

# ✅ 最终总结

牢记三句话：

- 流程 ≠ 业务
- 流程 = 调度器
- 业务逻辑永远在 Service

---

如果你已经会 Java/Spring：

👉 这个模式 = Spring + 状态机

思路完全一样，Nest 只是换了语法。

直接干就完事。
