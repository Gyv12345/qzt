# qzt-go-mall

企智通独立公开商城站（**免登录**）——访客直接浏览商品、选规格、下单（留手机号），订单自动在后端生成 PSI 销售单。生产部署在 `mall.devlovecode.com`。

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 构建 | Vite 7（`tsc -b && vite build`） |
| 框架 | React 19 + TypeScript 5.9 + react-router-dom 7 |
| UI | antd-mobile 5（PC 端限宽居中，移动端全宽） |
| 状态 | Zustand（购物车） |
| 包管理 | pnpm，dev 端口 **5175**，无测试框架 |

## 快速开始

```bash
pnpm install
pnpm dev        # http://localhost:5175，依赖后端 qzt-go-server 跑在 :9000
pnpm build      # dist/
```

本机 9000 被其他项目占用时，可指向生产后端走查：

```bash
MALL_API_TARGET=https://admin.devlovecode.com pnpm dev
```

（指向生产时 proxy **保留** `/prod-api` 前缀由 nginx 转发；指向本地后端则 rewrite 掉前缀。）

## 页面路由

| 路径 | 说明 |
| --- | --- |
| `/goods` `/goods/:id` | 商品列表 / 详情——数据复用 CRM 产品（`crm_product`），支持 **SKU 多规格**选择（规格定价、按 SKU 展示库存） |
| `/cart` | 购物车（Zustand 持久化） |
| `/checkout` | 下单——免登录留手机号，提交后自动生成 PSI 销售单 |
| `/order/query` | 订单查询 |

五个页面全部**同步打包**（免登录商城首屏要快），不 lazy。

## 约定

- 请求封装同 admin/mobile：`/prod-api` 单前缀 + axios 拦截器自动解包 `{code,msg,data}`，见 `src/utils/request.ts`。
- 商城站**无登录态**，不碰 token；商品/下单走后端 `mall` 模块的公开接口。
- 免登录 ≠ 无校验：下单等写操作由后端做频控与参数校验。

## 部署（纯静态）

```bash
pnpm build
rsync -az --delete -e "ssh -i <pem>" dist/ root@<server>:/opt/qzt-mall/
```

生产由 nginx 直接 serve 静态文件（HTTPS，`/prod-api` 转发到 `127.0.0.1:9000`）。

## 许可与商业服务

版权归 **河南爱编程网络科技有限公司** 所有，基于 [MIT 协议](../LICENSE) 开源——自行部署、使用、修改完全免费。

- **官方部署服务**（由我们代为部署上线）：**500 元 / 次**
- **二次开发 / 定制**：面谈

详见[工作区 README](../README.md)「版权与商业服务」。

