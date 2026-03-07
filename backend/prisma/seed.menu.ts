import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 按钮权限配置
 * 格式：`资源:操作`（如 contacts:view）
 */
const PERMISSION_CONFIG: Record<string, string[]> = {
  contacts: [
    "view",
    "create",
    "edit",
    "delete",
    "export",
    "import",
    "history",
    "linkCustomer",
  ],
  customers: [
    "view",
    "create",
    "edit",
    "delete",
    "export",
    "import",
    "batchUpdate",
    "batchAssign",
  ],
  contracts: ["view", "create", "edit", "delete", "updatePayment", "detail"],
  invoices: ["view", "create", "edit", "delete", "detail"],
  payments: ["view", "create", "edit", "delete", "confirm", "detail"],
  products: ["view", "create", "edit", "delete", "detail"],
  "contract-templates": ["view", "create", "edit", "preview"],
  webhooks: ["view", "create"],
  users: ["view", "create", "createBatch", "edit", "delete"],
  roles: ["view", "create", "edit", "delete"],
  menus: ["view", "create", "edit", "delete"],
  // 日志类只有 view
  "login-logs": ["view"],
  "operation-logs": ["view"],
  "system-logs": ["view"],
};

/**
 * 完整菜单配置
 * 包含所有必要的 i18n 字段
 */
const MENU_DATA = [
  // === 业务分组 ===
  {
    name: "工作台",
    path: "/",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.dashboard",
    icon: "LayoutDashboard",
    sort: 1,
    enabled: true,
    type: "menu",
  },
  // 客户中心父菜单（用于建立父子关系）
  {
    name: "客户中心",
    path: "/customer-center",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.customerCenter",
    icon: "Building",
    sort: 2,
    type: "group",
    enabled: true,
  },
  {
    name: "联系人管理",
    path: "/contacts",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.contacts",
    icon: "UserCircle",
    sort: 3,
    enabled: true,
    type: "menu",
  },
  {
    name: "客户管理",
    path: "/customers",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.customers",
    icon: "Building",
    sort: 4,
    enabled: true,
    type: "menu",
  },
  // 合同父菜单（用于建立父子关系）
  {
    name: "合同",
    path: "/contracts-group",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.contractsGroup",
    icon: "FileCheck",
    sort: 5,
    type: "group",
    enabled: true,
  },
  {
    name: "合同管理",
    path: "/contracts",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.contracts",
    icon: "FileCheck",
    sort: 6,
    enabled: true,
    type: "menu",
  },

  {
    name: "发票管理",
    path: "/invoices",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.invoices",
    icon: "Receipt",
    sort: 9,
    enabled: true,
    type: "menu",
  },
  {
    name: "收款管理",
    path: "/payments",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.payments",
    icon: "Wallet",
    sort: 10,
    enabled: true,
    type: "menu",
  },

  // === 内容管理分组 ===





  // === 业务设置分组 ===
  {
    name: "产品管理",
    path: "/products",
    groupTitle: "业务设置",
    groupI18nKey: "menu.sidebar.businessSettings",
    i18nKey: "menu.sidebar.products",
    icon: "Archive",
    sort: 30,
    enabled: true,
    type: "menu",
  },
  {
    name: "合同模板设置",
    path: "/contract-templates",
    groupTitle: "业务设置",
    groupI18nKey: "menu.sidebar.businessSettings",
    i18nKey: "menu.sidebar.contractTemplates",
    icon: "FileSignature",
    sort: 31,
    enabled: true,
    type: "menu",
  },
  {
    name: "客户规则",
    path: "/customer-rules",
    groupTitle: "业务设置",
    groupI18nKey: "menu.sidebar.businessSettings",
    i18nKey: "menu.sidebar.customerRules",
    icon: "Sliders",
    sort: 32,
    enabled: true,
    type: "menu",
  },
  {
    name: "Webhook配置",
    path: "/webhooks",
    groupTitle: "业务设置",
    groupI18nKey: "menu.sidebar.businessSettings",
    i18nKey: "menu.sidebar.webhooks",
    icon: "Webhook",
    sort: 33,
    enabled: true,
    type: "menu",
  },

  // === 系统设置分组 ===
  {
    name: "用户管理",
    path: "/users",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.users",
    icon: "Users",
    sort: 40,
    enabled: true,
    type: "menu",
  },
  {
    name: "部门管理",
    path: "/departments",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.departments",
    icon: "Building",
    sort: 41,
    enabled: true,
    type: "menu",
  },
  {
    name: "角色管理",
    path: "/roles",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.roles",
    icon: "ShieldCheck",
    sort: 42,
    enabled: true,
    type: "menu",
  },
  {
    name: "菜单管理",
    path: "/menus",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.menus",
    icon: "Menu",
    sort: 43,
    enabled: true,
    type: "menu",
  },
  {
    name: "登录日志",
    path: "/login-logs",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.loginLogs",
    icon: "History",
    sort: 45,
    enabled: true,
    type: "menu",
  },
  {
    name: "操作日志",
    path: "/operation-logs",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.operationLogs",
    icon: "ClipboardList",
    sort: 46,
    enabled: true,
    type: "menu",
  },
  {
    name: "系统日志",
    path: "/system-logs",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.systemLogs",
    icon: "Terminal",
    sort: 47,
    enabled: true,
    type: "menu",
  },
];

/**
 * 格式化权限名称
 * 将操作码转换为可读名称
 */
function formatPermissionName(action: string): string {
  const actionNames: Record<string, string> = {
    view: "查看",
    create: "新建",
    edit: "编辑",
    delete: "删除",
    export: "导出",
    import: "导入",
    history: "历史记录",
    linkCustomer: "关联客户",
    batchUpdate: "批量更新",
    batchAssign: "批量分配",
    updatePayment: "更新收款",
    detail: "查看详情",
    createBatch: "批量添加",
    confirm: "确认收款",
    preview: "预览",
  };
  return actionNames[action] || action;
}

/**
 * 菜单种子数据
 *
 * 运行方式：
 * 1. cd backend
 * 2. npx ts-node prisma/seed.menu.ts
 */
async function main() {
  console.log("🌱 开始填充菜单数据...");

  let menuCreated = 0;
  let menuUpdated = 0;
  let permissionCreated = 0;
  let permissionSkipped = 0;

  // ==================== 创建菜单 ====================
  console.log("\n📁 创建/更新菜单...");

  for (const menuData of MENU_DATA) {
    const existing = await prisma.menu.findUnique({
      where: { path: menuData.path },
    });

    if (existing) {
      // 更新现有菜单（保留 enabled 状态，允许手动控制）
      await prisma.menu.update({
        where: { id: existing.id },
        data: {
          name: menuData.name,
          icon: menuData.icon,
          sort: menuData.sort,
          type: menuData.type,
          groupTitle: menuData.groupTitle,
          groupI18nKey: menuData.groupI18nKey,
          i18nKey: menuData.i18nKey,
          // 不更新 enabled，保留手动修改
        },
      });
      menuUpdated++;
      console.log(`  ⊙ 更新菜单: ${menuData.name} (${menuData.path})`);
    } else {
      await prisma.menu.create({
        data: {
          path: menuData.path,
          name: menuData.name,
          icon: menuData.icon,
          sort: menuData.sort,
          enabled: menuData.enabled,
          type: menuData.type,
          groupTitle: menuData.groupTitle,
          groupI18nKey: menuData.groupI18nKey,
          i18nKey: menuData.i18nKey,
        },
      });
      menuCreated++;
      console.log(`  ✓ 创建菜单: ${menuData.name} (${menuData.path})`);
    }
  }

  // ==================== 创建按钮权限 ====================
  console.log("\n🔒 创建按钮权限...");

  for (const [resourceKey, actions] of Object.entries(PERMISSION_CONFIG)) {
    // 查找父菜单
    const parentMenu = await prisma.menu.findFirst({
      where: {
        path: {
          contains: resourceKey,
        },
        type: "menu",
      },
    });

    if (!parentMenu) {
      console.log(`  ⚠️  未找到菜单: ${resourceKey}`);
      continue;
    }

    for (const action of actions) {
      const permissionCode = `${resourceKey}:${action}`;
      const permissionName = formatPermissionName(action);

      // 检查权限是否已存在
      const existing = await prisma.menu.findFirst({
        where: {
          parentId: parentMenu.id,
          permissionCode: permissionCode,
        },
      });

      if (existing) {
        permissionSkipped++;
        continue;
      }

      await prisma.menu.create({
        data: {
          path: `${parentMenu.path}/${action}`,
          name: permissionName,
          type: "button",
          permissionCode: permissionCode,
          parentId: parentMenu.id,
          sort: action === "view" ? 0 : 1,
          enabled: true,
        },
      });

      permissionCreated++;
      console.log(`  ✓ 创建权限: ${permissionCode}`);
    }
  }

  // ==================== 设置菜单父子关系 ====================
  console.log("\n🔗 设置菜单父子关系...");

  // 客户中心分组
  const customerCenterGroup = await prisma.menu.findFirst({
    where: { path: "/customer-center" },
  });

  if (customerCenterGroup) {
    const customerPaths = ["/customers", "/contacts", "/service-teams"];
    for (const path of customerPaths) {
      await prisma.menu.updateMany({
        where: {
          path,
          parentId: null,
        },
        data: {
          parentId: customerCenterGroup.id,
        },
      });
    }
    console.log(`  ✓ 设置客户中心子菜单`);
  }

  // 合同分组
  const contractGroup = await prisma.menu.findFirst({
    where: { path: "/contracts-group" },
  });

  if (contractGroup) {
    const contractPaths = ["/contracts", "/contract-templates"];
    for (const path of contractPaths) {
      await prisma.menu.updateMany({
        where: {
          path,
          parentId: null,
        },
        data: {
          parentId: contractGroup.id,
        },
      });
    }
    console.log(`  ✓ 设置合同子菜单`);
  }

  console.log("\n✅ 菜单数据填充完成！");
  console.log("\n📊 数据统计：");
  console.log(`  - 菜单: 创建 ${menuCreated} 个, 更新 ${menuUpdated} 个`);
  console.log(`  - 权限: 创建 ${permissionCreated} 个, 跳过 ${permissionSkipped} 个`);

  // 最终统计
  const [menuCount, permissionCount] = await Promise.all([
    prisma.menu.count({ where: { type: { in: ["menu", "group"] } } }),
    prisma.menu.count({ where: { type: "button" } }),
  ]);

  console.log(`\n📈 当前数据库：`);
  console.log(`  - 菜单总数: ${menuCount} 个`);
  console.log(`  - 权限总数: ${permissionCount} 个`);
}

main()
  .catch((e) => {
    console.error("❌ 填充数据失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
