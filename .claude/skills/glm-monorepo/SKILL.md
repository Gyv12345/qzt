---
name: glm-monorepo
description: 企智通项目全栈开发技能。用于单体 Monorepo 项目的后端 API 开发、前端 CRUD 页面开发。后端 NestJS + Prisma，前端 React + TanStack Router + Shadcn UI。核心约定：CRUD 使用抽屉、头部包含搜索/主题/i18n/用户、所有文本 i18n 化、API 使用英文 @ApiTags、分页响应统一使用 data 字段。
---

## 快速开始

```bash
./start-dev.sh    # 启动前后端（前端 3456，后端 7890）
```

## 后端开发约定

### 1. API 开发流程

```
后端开发 API → 生成客户端 → 前端使用
```

### 2. 分页响应结构（强制）

```typescript
// ✅ 唯一正确的结构
return {
  data: result,      // 必须用 data 字段
  total,
  page,
  pageSize,
  totalPages: Math.ceil(total / pageSize),
}

// ❌ 禁止使用
items: result
records: result
list: result
```

### 3. @ApiTags 必须（强制）

```typescript
// ✅ 正确 - 英文
@ApiTags('contacts')
@ApiTags('customers')

// ❌ 错误 - 中文（会导致跨平台文件名问题）
@ApiTags('联系人')
@ApiTags('客户管理')
```

### 4. 错误信息 i18n

```typescript
// service 中注入 I18nService
constructor(private i18n: I18nService) {}

// 使用翻译 key
throw new BadRequestException(this.i18n.t('common.BAD_REQUEST'));

// 翻译文件位置：backend/src/i18n/{zh,en}/common.json
```

### 5. HTTP 状态码

- `201 Created` - 创建新资源
- `200 OK` - POST 但非创建资源
- `204 No Content` - 成功但无返回内容

## 前端开发约定

### 1. CRUD 页面结构（强制使用抽屉）

所有 CRUD 新建/编辑操作**必须使用抽屉（Sheet/Drawer）**，禁止使用 Dialog。

```typescript
// ✅ 正确 - 使用 Sheet/Drawer
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";

export function ContactFormDrawer({ open, onOpenChange, contact, onSuccess }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="min-w-[500px]">
        {/* 表单内容 */}
      </SheetContent>
    </Sheet>
  );
}

// ❌ 错误 - 不要用 Dialog 做表单
import { Dialog, DialogContent } from "@/components/ui/dialog";
```

### 2. 页面头部固定元素（强制）

每个 CRUD 页面头部**必须包含**以下元素：

```tsx
<Header fixed>
  <Search />                    {/* 搜索 */}
  <div className="ms-auto flex items-center space-x-4">
    <ThemeSwitch />             {/* 主题切换 */}
    <LanguageSwitch />           {/* i18n 切换 */}
    <ConfigDrawer />             {/* 设置抽屉 */}
    <ProfileDropdown />          {/* 当前登录人 */}
  </div>
</Header>
```

### 3. 页面结构模板

```tsx
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import { LanguageSwitch } from "@/components/language-switch";
import { ConfigDrawer } from "@/components/config-drawer";
import { ProfileDropdown } from "@/components/profile-dropdown";

function ModuleContent() {
  const { t } = useTranslation();  // i18n hook
  return (
    <>
      <Header fixed>
        <Search />
        <div className="ms-auto flex items-center space-x-4">
          <ThemeSwitch />
          <LanguageSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {/* 标题和操作按钮 */}
        <div className="flex justify-between">
          <div>
            <h2>{t("module.title")}</h2>          {/* i18n */}
            <p>{t("module.description")}</p>      {/* i18n */}
          </div>
          <PrimaryButtons onCreate={...} />
        </div>

        {/* 表格 */}
        <ModuleTable />
      </Main>
    </>
  );
}
```

### 4. 文本 i18n（强制）

所有**固定显示的文本**必须使用 i18n，禁止硬编码中文。

```tsx
// ✅ 正确
const { t } = useTranslation();
<h2>{t("contact.title")}</h2>
<Button>{t("common.create")}</Button>
<toast.success={t("contact.createSuccess")} />

// ❌ 错误
<h2>联系人管理</h2>
<Button>新建</Button>
<toast.success="创建成功" />
```

i18n 文件位置：`frontend/src/i18n/locales/{zh,en}/translation.json`

### 5. 分页数据访问

```typescript
// ✅ 正确 - 使用 data 字段
const items = data?.data || [];

// ❌ 错误
const items = data?.items || []
const items = data?.records || []
```

### 6. API 调用约定

```bash
# 后端开发完成后
cd frontend && pnpm run generate:api

# 查看生成的类型
cat frontend/src/models/createContactDto.ts
```

```typescript
// ✅ 正确调用
const { contactControllerFindAll } = getScrmApi();
return await contactControllerFindAll(params);

// ❌ 错误 - 不要访问 .data
const response = await contactControllerFindAll(params);
return response.data;  // undefined!
```

### 7. 表单抽屉（Drawer）完整模板

```tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";

interface XxxFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: Xxx;
  onSuccess: () => void;
}

export function XxxFormDrawer({ open, onOpenChange, data, onSuccess }: XxxFormDrawerProps) {
  const isEdit = !!data;
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  const form = useForm<z.infer<typeof xxxSchema>>({
    resolver: zodResolver(xxxSchema),
    defaultValues: data || defaultValues,
  });

  useEffect(() => {
    if (!open) form.reset();
  }, [open, form]);

  const onSubmit = async (values) => {
    // 提交逻辑
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={drawerSide} className={isMobile ? "h-[85vh]" : "w-[600px]"}>
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>{isEdit ? "编辑" : "新建"}</SheetTitle>
          <SheetDescription>{isEdit ? "修改信息" : "填写基本信息"}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4 pb-6">
            {/* 表单字段 */}
            <SheetFooter className="px-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button type="submit">提交</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
```

### 8. 删除确认对话框（AlertDialog）

```tsx
// ❌ 禁止使用 window.confirm
if (window.confirm("确定要删除吗？")) { ... }

// ✅ 使用 AlertDialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// 在组件中添加状态
const [deleteId, setDeleteId] = useState<string | null>(null);
const [isDeleting, setIsDeleting] = useState(false);

// 删除按钮点击
const handleDeleteClick = (id: string) => setDeleteId(id);

// 确认删除
const handleConfirmDelete = async () => {
  if (!deleteId) return;
  setIsDeleting(true);
  try {
    await deleteMutation.mutateAsync(deleteId);
    onRefresh();
  } finally {
    setIsDeleting(false);
    setDeleteId(null);
  }
};

// JSX 中添加对话框
<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>确认删除</AlertDialogTitle>
      <AlertDialogDescription>确定要删除吗？此操作无法撤销。</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
        {isDeleting ? "删除中..." : "删除"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**注意**：确认删除按钮使用默认样式，不要添加 `bg-destructive` 红色样式，保持与项目中其他对话框一致。

## React Hooks 规范

**黄金法则**：所有 Hooks 必须在顶层调用，条件渲染放在所有 Hooks 之后。

```tsx
// ✅ 正确
function Component() {
  const data = useQuery();
  const [state, setState] = useState();
  const memoized = useMemo(...);  // 始终调用

  if (isLoading) return <Loading />;  // 条件放最后
  return <View />;
}

// ❌ 错误
function Component() {
  const data = useQuery();
  if (isLoading) {
    return <Loading />;  // 早期返回导致后续 Hooks 不被调用
  }
  const memoized = useMemo(...);
  return <View />;
}
```

## 目录结构

### 后端
```
backend/src/modules/{module}/
├── {module}.controller.ts
├── {module}.service.ts
├── {module}.module.ts
└── dto/
    ├── create-{module}.dto.ts
    ├── update-{module}.dto.ts
    └── query-{module}.dto.ts
```

### 前端
```
frontend/src/features/{module}/
├── index.tsx
├── types/{module}.ts          # Zod schema
├── hooks/use-{module}s.ts     # API hooks
└── components/
    ├── {module}s-table.tsx
    ├── {module}s-columns.tsx
    ├── {module}s-primary-buttons.tsx
    ├── {module}s-dialogs.tsx  # Context API
    ├── {module}-form-drawer.tsx  # 表单抽屉
    └── data-table-row-actions.tsx
```

## 常用命令

```bash
# 启动服务
./start-dev.sh

# API 生成
cd frontend && pnpm run generate:api

# 数据库
cd backend && pnpm prisma generate && pnpm prisma db push
```

## 快速检查清单

### 后端
- [ ] 分页响应使用 `data` 字段
- [ ] `@ApiTags` 使用英文
- [ ] 错误消息使用 `this.i18n.t()`

### 前端
- [ ] CRUD 使用抽屉（Sheet/Drawer）
- [ ] 头部包含 Search/Theme/i18n/User
- [ ] 固定文本使用 `t()` i18n
- [ ] 分页数据使用 `data?.data`
- [ ] Hooks 在顶层调用
- [ ] 删除确认使用 AlertDialog，不用 window.confirm
- [ ] AlertDialog 样式保持一致（确认按钮不用红色）

## 参考文档

详细参考文档位于 `references/` 目录：

| 文档 | 内容 |
|------|------|
| [contacts-crud-template.md](./references/contacts-crud-template.md) | 联系人 CRUD 完整模板 |
| [pagination-response-standard.md](./references/pagination-response-standard.md) | 分页响应规范 |
| [troubleshooting.md](./references/troubleshooting.md) | 故障排除 |
