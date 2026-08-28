# qzt-docs

企智通文档中心（Docusaurus 3 静态站）——面向用户/实施/二开的公开文档，生产地址 `https://docs.devlovecode.com`。

## 内容结构（docs/）

| 目录 | 内容 |
| --- | --- |
| `intro/` | 平台介绍、功能总览、技术栈 |
| `architecture/` | 架构总览、后端分层、鉴权/RBAC、数据库、前端、文件存储 |
| `modules/` | 各业务模块文档：system / crm / psi / finance / hrm / oa / approval / project / kb / cloud / cms / enterprise / api / ai（MCP 定位） |
| `deployment/` | 部署手册：server / admin / cms / mobile / 容量评估 |

路由挂在根路径（`routeBasePath: '/'`，无 blog），中文单语言（zh-Hans）。

## 本地开发

```bash
npm install
npm start              # dev server，默认 :3000（被占用时 npm start -- --port 3001）
npm run build          # 生成静态站到 build/
```

## 维护注意

- 文档与实际实现可能有滞后：后端模块数、菜单结构以 `qzt-go-server` 代码和 `sys_menu` 为准（如邮件 / e签宝等已下线功能不再出现在新文档里）。
- 源码在 `qzt-docs` 子项目内，见工作区根 `AGENTS.md` 的部署章节。

## 许可与商业服务

版权归 **河南爱编程网络科技有限公司** 所有，基于 [MIT 协议](../LICENSE) 开源——自行部署、使用、修改完全免费。

- **官方部署服务**（由我们代为部署上线）：**500 元 / 次**
- **二次开发 / 定制**：面谈

详见[工作区 README](../README.md)「版权与商业服务」。

