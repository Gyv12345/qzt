package model

// seed_data.go 内置 API、菜单、字典的初始数据。
// 注意：API 的 Path 以模块名 /system 为前缀（module system 注册在 /system 下），
// Casbin 策略的 obj 与之一致。ID 显式且稳定，便于菜单按索引引用 apis[id-1]。

// defaultAPIs 内置接口记录全集。
func defaultAPIs() []SysAPI {
	return []SysAPI{
		// 用户管理 (1-5)
		{ID: 1, Path: "/system/users", Method: "GET", Group: "用户管理", Description: "用户列表"},
		{ID: 2, Path: "/system/users", Method: "POST", Group: "用户管理", Description: "创建用户"},
		{ID: 3, Path: "/system/users/:id", Method: "GET", Group: "用户管理", Description: "用户详情"},
		{ID: 4, Path: "/system/users/:id", Method: "PUT", Group: "用户管理", Description: "更新用户"},
		{ID: 5, Path: "/system/users/:id", Method: "DELETE", Group: "用户管理", Description: "删除用户"},
		// 角色管理 (6-11)
		{ID: 6, Path: "/system/roles", Method: "GET", Group: "角色管理", Description: "角色列表"},
		{ID: 7, Path: "/system/roles", Method: "POST", Group: "角色管理", Description: "创建角色"},
		{ID: 8, Path: "/system/roles/:id", Method: "GET", Group: "角色管理", Description: "角色详情"},
		{ID: 9, Path: "/system/roles/:id", Method: "PUT", Group: "角色管理", Description: "更新角色"},
		{ID: 10, Path: "/system/roles/:id", Method: "DELETE", Group: "角色管理", Description: "删除角色"},
		{ID: 11, Path: "/system/roles/:id/menus", Method: "PUT", Group: "角色管理", Description: "分配菜单"},
		// 菜单管理 (12-15)
		{ID: 12, Path: "/system/menus", Method: "GET", Group: "菜单管理", Description: "菜单列表"},
		{ID: 13, Path: "/system/menus/:id", Method: "GET", Group: "菜单管理", Description: "菜单详情"},
		{ID: 14, Path: "/system/menus/:id", Method: "PUT", Group: "菜单管理", Description: "更新菜单"},
		{ID: 15, Path: "/system/menus/:id", Method: "DELETE", Group: "菜单管理", Description: "删除菜单"},
		// API 管理 (16-19)
		{ID: 16, Path: "/system/apis", Method: "GET", Group: "API管理", Description: "API列表"},
		{ID: 17, Path: "/system/apis", Method: "POST", Group: "API管理", Description: "创建API"},
		{ID: 18, Path: "/system/apis/:id", Method: "PUT", Group: "API管理", Description: "更新API"},
		{ID: 19, Path: "/system/apis/:id", Method: "DELETE", Group: "API管理", Description: "删除API"},
		// 字典管理 (20-23)
		{ID: 20, Path: "/system/dicts", Method: "GET", Group: "字典管理", Description: "字典列表"},
		{ID: 21, Path: "/system/dicts", Method: "POST", Group: "字典管理", Description: "创建字典"},
		{ID: 22, Path: "/system/dicts/:id", Method: "PUT", Group: "字典管理", Description: "更新字典"},
		{ID: 23, Path: "/system/dicts/:id", Method: "DELETE", Group: "字典管理", Description: "删除字典"},
		// 系统配置 (24-28)
		{ID: 24, Path: "/system/configs", Method: "GET", Group: "系统配置", Description: "配置列表"},
		{ID: 25, Path: "/system/configs", Method: "POST", Group: "系统配置", Description: "新增配置"},
		{ID: 26, Path: "/system/configs", Method: "PUT", Group: "系统配置", Description: "批量保存配置"},
		{ID: 27, Path: "/system/configs/:id", Method: "DELETE", Group: "系统配置", Description: "删除配置"},
		{ID: 28, Path: "/system/configs/refresh", Method: "POST", Group: "系统配置", Description: "刷新配置缓存"},
		// 操作日志 (29-32)
		{ID: 29, Path: "/system/operation-logs", Method: "GET", Group: "操作日志", Description: "日志列表"},
		{ID: 30, Path: "/system/operation-logs/:id", Method: "GET", Group: "操作日志", Description: "日志详情"},
		{ID: 31, Path: "/system/operation-logs/:id", Method: "DELETE", Group: "操作日志", Description: "删除日志"},
		{ID: 32, Path: "/system/operation-logs", Method: "DELETE", Group: "操作日志", Description: "清空日志"},

		// ── CMS 内容管理（仅登记受保护的 CRUD 接口；公开只读 GET 不登记）──
		// 文章分类 (33-37)
		{ID: 33, Path: "/cms/categories", Method: "GET", Group: "文章分类", Description: "分类列表"},
		{ID: 34, Path: "/cms/categories", Method: "POST", Group: "文章分类", Description: "创建分类"},
		{ID: 35, Path: "/cms/categories/:id", Method: "GET", Group: "文章分类", Description: "分类详情"},
		{ID: 36, Path: "/cms/categories/:id", Method: "PUT", Group: "文章分类", Description: "更新分类"},
		{ID: 37, Path: "/cms/categories/:id", Method: "DELETE", Group: "文章分类", Description: "删除分类"},
		// 文章标签 (38-42)
		{ID: 38, Path: "/cms/tags", Method: "GET", Group: "文章标签", Description: "标签列表"},
		{ID: 39, Path: "/cms/tags", Method: "POST", Group: "文章标签", Description: "创建标签"},
		{ID: 40, Path: "/cms/tags/:id", Method: "GET", Group: "文章标签", Description: "标签详情"},
		{ID: 41, Path: "/cms/tags/:id", Method: "PUT", Group: "文章标签", Description: "更新标签"},
		{ID: 42, Path: "/cms/tags/:id", Method: "DELETE", Group: "文章标签", Description: "删除标签"},
		// 文章管理 (43-47)
		{ID: 43, Path: "/cms/articles", Method: "GET", Group: "文章管理", Description: "文章列表"},
		{ID: 44, Path: "/cms/articles", Method: "POST", Group: "文章管理", Description: "创建文章"},
		{ID: 45, Path: "/cms/articles/:id", Method: "GET", Group: "文章管理", Description: "文章详情"},
		{ID: 46, Path: "/cms/articles/:id", Method: "PUT", Group: "文章管理", Description: "更新文章"},
		{ID: 47, Path: "/cms/articles/:id", Method: "DELETE", Group: "文章管理", Description: "删除文章"},
		// 单页管理 (48-52)
		{ID: 48, Path: "/cms/pages", Method: "GET", Group: "单页管理", Description: "单页列表"},
		{ID: 49, Path: "/cms/pages", Method: "POST", Group: "单页管理", Description: "创建单页"},
		{ID: 50, Path: "/cms/pages/:id", Method: "GET", Group: "单页管理", Description: "单页详情"},
		{ID: 51, Path: "/cms/pages/:id", Method: "PUT", Group: "单页管理", Description: "更新单页"},
		{ID: 52, Path: "/cms/pages/:id", Method: "DELETE", Group: "单页管理", Description: "删除单页"},
	}
}

// defaultMenus 内置菜单树（目录/菜单/按钮），每个按钮节点挂载其授权的 API。
// 参数 a 为 defaultAPIs() 的返回，a[n-1] 即 ID 为 n 的 API。
func defaultMenus(a []SysAPI) []SysMenu {
	return []SysMenu{
		// ── 系统管理（目录）──
		{ID: 1, ParentID: 0, Name: "系统管理", Path: "/system", Icon: "Setting", Sort: 1, Type: MenuTypeDir, Visible: StatusEnabled, Status: StatusEnabled},

		// ── 用户管理 ──
		{ID: 2, ParentID: 1, Name: "用户管理", Path: "/system/user", Component: "system/user/index", Icon: "User", Sort: 1, Type: MenuTypeMenu, Permission: "system:user:list", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[0]}},
		{ID: 20, ParentID: 2, Name: "用户详情", Sort: 1, Type: MenuTypeButton, Permission: "system:user:query", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[2]}},
		{ID: 21, ParentID: 2, Name: "新增用户", Sort: 2, Type: MenuTypeButton, Permission: "system:user:add", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[1]}},
		{ID: 22, ParentID: 2, Name: "编辑用户", Sort: 3, Type: MenuTypeButton, Permission: "system:user:edit", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[2], a[3]}},
		{ID: 23, ParentID: 2, Name: "删除用户", Sort: 4, Type: MenuTypeButton, Permission: "system:user:delete", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[4]}},

		// ── 角色管理 ──
		{ID: 3, ParentID: 1, Name: "角色管理", Path: "/system/role", Component: "system/role/index", Icon: "UserFilled", Sort: 2, Type: MenuTypeMenu, Permission: "system:role:list", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[5]}},
		{ID: 30, ParentID: 3, Name: "角色详情", Sort: 1, Type: MenuTypeButton, Permission: "system:role:query", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[7]}},
		{ID: 31, ParentID: 3, Name: "新增角色", Sort: 2, Type: MenuTypeButton, Permission: "system:role:add", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[6]}},
		{ID: 32, ParentID: 3, Name: "编辑角色", Sort: 3, Type: MenuTypeButton, Permission: "system:role:edit", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[7], a[8], a[10]}},
		{ID: 33, ParentID: 3, Name: "删除角色", Sort: 4, Type: MenuTypeButton, Permission: "system:role:delete", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[9]}},

		// ── 菜单管理 ──
		{ID: 4, ParentID: 1, Name: "菜单管理", Path: "/system/menu", Component: "system/menu/index", Icon: "Menu", Sort: 3, Type: MenuTypeMenu, Permission: "system:menu:list", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[11]}},
		{ID: 40, ParentID: 4, Name: "菜单详情", Sort: 1, Type: MenuTypeButton, Permission: "system:menu:query", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[12]}},
		{ID: 41, ParentID: 4, Name: "新增菜单", Sort: 2, Type: MenuTypeButton, Permission: "system:menu:add", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{}},
		{ID: 42, ParentID: 4, Name: "编辑菜单", Sort: 3, Type: MenuTypeButton, Permission: "system:menu:edit", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[12], a[13]}},
		{ID: 43, ParentID: 4, Name: "删除菜单", Sort: 4, Type: MenuTypeButton, Permission: "system:menu:delete", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[14]}},

		// ── 字典管理 ──
		{ID: 7, ParentID: 1, Name: "字典管理", Path: "/system/dict", Component: "system/dict/index", Icon: "Collection", Sort: 4, Type: MenuTypeMenu, Permission: "system:dict:list", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[19]}},
		{ID: 70, ParentID: 7, Name: "新增字典", Sort: 1, Type: MenuTypeButton, Permission: "system:dict:add", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[20]}},
		{ID: 71, ParentID: 7, Name: "编辑字典", Sort: 2, Type: MenuTypeButton, Permission: "system:dict:edit", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[21]}},
		{ID: 72, ParentID: 7, Name: "删除字典", Sort: 3, Type: MenuTypeButton, Permission: "system:dict:delete", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[22]}},

		// ── 系统配置 ──
		{ID: 5, ParentID: 1, Name: "系统配置", Path: "/system/config", Component: "system/config/index", Icon: "Tools", Sort: 5, Type: MenuTypeMenu, Permission: "system:config:list", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[23]}},
		{ID: 50, ParentID: 5, Name: "保存配置", Sort: 1, Type: MenuTypeButton, Permission: "system:config:edit", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[25], a[27]}},
		{ID: 51, ParentID: 5, Name: "新增配置", Sort: 2, Type: MenuTypeButton, Permission: "system:config:add", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[24]}},
		{ID: 52, ParentID: 5, Name: "删除配置", Sort: 3, Type: MenuTypeButton, Permission: "system:config:delete", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[26]}},

		// ── 操作日志 ──
		{ID: 6, ParentID: 1, Name: "操作日志", Path: "/system/operlog", Component: "system/operlog/index", Icon: "Document", Sort: 6, Type: MenuTypeMenu, Permission: "system:operlog:list", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[28], a[29]}},
		{ID: 60, ParentID: 6, Name: "删除日志", Sort: 1, Type: MenuTypeButton, Permission: "system:operlog:delete", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[30]}},
		{ID: 61, ParentID: 6, Name: "清空日志", Sort: 2, Type: MenuTypeButton, Permission: "system:operlog:clear", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[31]}},

		// ── 内容管理（CMS 目录，ID 从 100 起，避开系统菜单）──
		{ID: 100, ParentID: 0, Name: "内容管理", Path: "/cms", Icon: "Document", Sort: 2, Type: MenuTypeDir, Visible: StatusEnabled, Status: StatusEnabled},

		// ── 文章分类 ──
		{ID: 110, ParentID: 100, Name: "文章分类", Path: "/cms/category", Component: "cms/category/index", Icon: "Files", Sort: 1, Type: MenuTypeMenu, Permission: "cms:category:list", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[32]}},
		{ID: 111, ParentID: 110, Name: "分类详情", Sort: 1, Type: MenuTypeButton, Permission: "cms:category:query", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[34]}},
		{ID: 112, ParentID: 110, Name: "新增分类", Sort: 2, Type: MenuTypeButton, Permission: "cms:category:add", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[33]}},
		{ID: 113, ParentID: 110, Name: "编辑分类", Sort: 3, Type: MenuTypeButton, Permission: "cms:category:edit", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[34], a[35]}},
		{ID: 114, ParentID: 110, Name: "删除分类", Sort: 4, Type: MenuTypeButton, Permission: "cms:category:delete", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[36]}},

		// ── 文章标签 ──
		{ID: 120, ParentID: 100, Name: "文章标签", Path: "/cms/tag", Component: "cms/tag/index", Icon: "PriceTag", Sort: 2, Type: MenuTypeMenu, Permission: "cms:tag:list", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[37]}},
		{ID: 121, ParentID: 120, Name: "标签详情", Sort: 1, Type: MenuTypeButton, Permission: "cms:tag:query", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[39]}},
		{ID: 122, ParentID: 120, Name: "新增标签", Sort: 2, Type: MenuTypeButton, Permission: "cms:tag:add", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[38]}},
		{ID: 123, ParentID: 120, Name: "编辑标签", Sort: 3, Type: MenuTypeButton, Permission: "cms:tag:edit", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[39], a[40]}},
		{ID: 124, ParentID: 120, Name: "删除标签", Sort: 4, Type: MenuTypeButton, Permission: "cms:tag:delete", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[41]}},

		// ── 文章管理 ──
		{ID: 130, ParentID: 100, Name: "文章管理", Path: "/cms/article", Component: "cms/article/index", Icon: "Reading", Sort: 3, Type: MenuTypeMenu, Permission: "cms:article:list", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[42]}},
		{ID: 131, ParentID: 130, Name: "文章详情", Sort: 1, Type: MenuTypeButton, Permission: "cms:article:query", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[44]}},
		{ID: 132, ParentID: 130, Name: "新增文章", Sort: 2, Type: MenuTypeButton, Permission: "cms:article:add", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[43]}},
		{ID: 133, ParentID: 130, Name: "编辑文章", Sort: 3, Type: MenuTypeButton, Permission: "cms:article:edit", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[44], a[45]}},
		{ID: 134, ParentID: 130, Name: "删除文章", Sort: 4, Type: MenuTypeButton, Permission: "cms:article:delete", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[46]}},

		// ── 单页管理 ──
		{ID: 140, ParentID: 100, Name: "单页管理", Path: "/cms/page", Component: "cms/page/index", Icon: "DocumentCopy", Sort: 4, Type: MenuTypeMenu, Permission: "cms:page:list", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[47]}},
		{ID: 141, ParentID: 140, Name: "单页详情", Sort: 1, Type: MenuTypeButton, Permission: "cms:page:query", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[49]}},
		{ID: 142, ParentID: 140, Name: "新增单页", Sort: 2, Type: MenuTypeButton, Permission: "cms:page:add", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[48]}},
		{ID: 143, ParentID: 140, Name: "编辑单页", Sort: 3, Type: MenuTypeButton, Permission: "cms:page:edit", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[49], a[50]}},
		{ID: 144, ParentID: 140, Name: "删除单页", Sort: 4, Type: MenuTypeButton, Permission: "cms:page:delete", Visible: StatusEnabled, Status: StatusEnabled,
			APIs: []SysAPI{a[51]}},
	}
}

// defaultDicts 示例字典：客户状态（潜在/正式/流失），对应 PRD §6.3 示例。
func defaultDicts() []SysDict {
	return []SysDict{
		{
			Name: "客户状态", Code: "customer_status", Status: StatusEnabled, Remark: "CRM 客户状态示例",
			Items: []SysDictItem{
				{Label: "潜在客户", Value: "1", Sort: 1, Status: StatusEnabled},
				{Label: "正式客户", Value: "2", Sort: 2, Status: StatusEnabled},
				{Label: "流失客户", Value: "3", Sort: 3, Status: StatusEnabled},
			},
		},
		{
			Name: "通用状态", Code: "common_status", Status: StatusEnabled, Remark: "通用启用/禁用",
			Items: []SysDictItem{
				{Label: "启用", Value: "1", Sort: 1, Status: StatusEnabled},
				{Label: "禁用", Value: "0", Sort: 2, Status: StatusEnabled},
			},
		},
	}
}

// crmDicts CRM 字典(对齐 qztcrm 迁移脚本)。Code 用大写常量风格,与 qztcrm 一致。
func crmDicts() []SysDict {
	enabled := StatusEnabled
	return []SysDict{
		dict("客户级别", "CUSTOMER_LEVEL", "客户级别 A/B/C", enabled,
			item("重要", "A", 1, enabled), item("普通", "B", 2, enabled), item("低价值", "C", 3, enabled)),
		dict("客户来源", "CUSTOMER_SOURCE", "客户来源", enabled,
			item("主动开发", "1", 1, enabled), item("客户介绍", "2", 2, enabled),
			item("营销活动", "3", 3, enabled), item("网络推广", "4", 4, enabled), item("其他", "99", 99, enabled)),
		dict("客户状态", "CUSTOMER_STATUS", "客户状态", enabled,
			item("正常", "1", 1, enabled), item("冻结", "2", 2, enabled), item("流失", "3", 3, enabled)),
		dict("行业", "INDUSTRY", "行业", enabled,
			item("IT/互联网", "IT", 1, enabled), item("金融", "FIN", 2, enabled), item("制造业", "MFG", 3, enabled),
			item("教育", "EDU", 4, enabled), item("医疗", "MED", 5, enabled), item("零售", "RTL", 6, enabled),
			item("其他", "OTHER", 99, enabled)),
		dict("商机阶段", "OPPORTUNITY_STAGE", "商机销售阶段", enabled,
			item("初步接触", "PROSPECTING", 10, enabled), item("需求分析", "ANALYSIS", 20, enabled),
			item("方案报价", "PROPOSAL", 30, enabled), item("谈判", "NEGOTIATION", 40, enabled),
			item("已成交", "WON", 50, enabled), item("已丢失", "LOST", 60, enabled)),
		dict("合同阶段", "CONTRACT_STAGE", "合同阶段", enabled,
			item("草稿", "DRAFT", 10, enabled), item("审批中", "APPROVAL", 20, enabled),
			item("已签订", "SIGNED", 30, enabled), item("执行中", "EXECUTING", 40, enabled),
			item("已完成", "COMPLETED", 50, enabled), item("已终止", "TERMINATED", 60, enabled)),
		dict("回款方式", "PAYMENT_METHOD", "回款方式", enabled,
			item("银行转账", "TRANSFER", 1, enabled), item("现金", "CASH", 2, enabled),
			item("支票", "CHECK", 3, enabled), item("其他", "OTHER", 99, enabled)),
		dict("商品分类", "PRODUCT_CATEGORY", "商品分类", enabled,
			item("软件", "SOFTWARE", 1, enabled), item("硬件", "HARDWARE", 2, enabled),
			item("服务", "SERVICE", 3, enabled), item("其他", "OTHER", 99, enabled)),
		dict("商品状态", "PRODUCT_STATUS", "商品上下架", enabled,
			item("上架", "1", 1, enabled), item("下架", "2", 2, enabled)),
		dict("商品价格类型", "PRODUCT_PRICE_TYPE", "商品多价格类型", enabled,
			item("VIP价", "VIP", 1, enabled), item("普通价", "NORMAL", 2, enabled),
			item("大客户价", "ENTERPRISE", 3, enabled), item("促销价", "PROMOTION", 4, enabled)),
		dict("跟进类型", "FOLLOW_UP_TYPE", "跟进方式", enabled,
			item("微信", "WECHAT", 1, enabled), item("电话", "PHONE", 2, enabled),
			item("拜访", "VISIT", 3, enabled), item("邮件", "EMAIL", 4, enabled), item("其他", "OTHER", 99, enabled)),
		dict("公海原因", "CUSTOMER_POOL_REASON", "客户进入公海的原因", enabled,
			item("主动放弃", "GIVE_UP", 1, enabled), item("客户无需求", "NO_DEMAND", 2, enabled),
			item("联系不上", "UNREACHABLE", 3, enabled), item("自动回收", "AUTO_RECYCLE", 99, enabled)),
	}
}

// hrmDicts HRM 字典(员工状态/性别/变更类型)。
func hrmDicts() []SysDict {
	enabled := StatusEnabled
	return []SysDict{
		dict("员工状态", "EMPLOYEE_STATUS", "员工在职状态", enabled,
			item("在职", "1", 1, enabled), item("试用", "2", 2, enabled), item("离职", "3", 3, enabled)),
		dict("性别", "GENDER", "性别", enabled,
			item("未知", "0", 0, enabled), item("男", "1", 1, enabled), item("女", "2", 2, enabled)),
		dict("变更类型", "POSITION_CHANGE_TYPE", "员工部门/岗位变更类型", enabled,
			item("入职", "HIRE", 1, enabled), item("调部门", "DEPT_MOVE", 2, enabled),
			item("调岗", "TRANSFER", 3, enabled), item("离职", "RESIGN", 4, enabled)),
	}
}

// dict 构造字典(含多项)的便捷函数。
func dict(name, code, remark string, status int8, items ...SysDictItem) SysDict {
	return SysDict{Name: name, Code: code, Status: status, Remark: remark, Items: items}
}

// item 构造字典项的便捷函数。
func item(label, value string, sort int, status int8) SysDictItem {
	return SysDictItem{Label: label, Value: value, Sort: sort, Status: status}
}

// psiDicts PSI 进销存字典(仓库状态/供应商状态/单据状态/流水类型/出入库子类型)。
func psiDicts() []SysDict {
	enabled := StatusEnabled
	return []SysDict{
		dict("PSI通用状态", "PSI_COMMON_STATUS", "进销存启用/停用", enabled,
			item("启用", "1", 1, enabled), item("停用", "2", 2, enabled)),
		dict("采购单状态", "PURCHASE_ORDER_STATUS", "采购单流转状态", enabled,
			item("待入库", "1", 1, enabled), item("已入库", "2", 2, enabled), item("已关闭", "3", 3, enabled)),
		dict("销售单状态", "SALES_ORDER_STATUS", "销售单流转状态", enabled,
			item("待出库", "1", 1, enabled), item("已出库", "2", 2, enabled), item("已关闭", "3", 3, enabled)),
		dict("退货状态", "RETURN_STATUS", "采购/销售退货状态", enabled,
			item("待处理", "1", 1, enabled), item("已完成", "2", 2, enabled)),
		dict("库存流水类型", "STOCK_MOVEMENT_TYPE", "库存出入库流水业务类型", enabled,
			item("采购入库", "PURCHASE_IN", 1, enabled), item("销售出库", "SALES_OUT", 2, enabled),
			item("采购退货出库", "PURCHASE_RETURN_OUT", 3, enabled), item("销售退货入库", "SALES_RETURN_IN", 4, enabled),
			item("其他入库", "STOCK_IN", 5, enabled), item("其他出库", "STOCK_OUT", 6, enabled),
			item("期初", "INIT", 7, enabled)),
		dict("其他入库类型", "STOCK_IN_TYPE", "其他入库单子类型", enabled,
			item("期初", "INIT", 1, enabled), item("盘盈", "PROFIT", 2, enabled),
			item("赠品", "GIFT", 3, enabled), item("其他", "OTHER", 99, enabled)),
		dict("其他出库类型", "STOCK_OUT_TYPE", "其他出库单子类型", enabled,
			item("盘亏", "LOSS", 1, enabled), item("报损", "SCRAP", 2, enabled),
			item("领用", "USE", 3, enabled), item("其他", "OTHER", 99, enabled)),
	}
}
