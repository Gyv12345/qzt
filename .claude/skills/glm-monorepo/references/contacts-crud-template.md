# CRUD 模板

本文档提供项目 CRUD 功能的完整代码参考。开发新 CRUD 功能时，参考联系人模块的实现。

## 快速开始

```bash
# 复制联系人模块作为起点
cp -r frontend/src/features/contacts frontend/src/features/{new-module}

# 批量替换（IDE 或命令行）
# Contact → NewModule
# contact → newModule
```

## 前端组件结构

```
features/{module}/
├── components/
│   ├── {module}s-dialogs.tsx       # Context API 状态管理
│   ├── {module}-form-drawer.tsx    # 表单抽屉（Sheet）
│   ├── {module}-detail-drawer.tsx  # 详情抽屉（可选）
│   ├── {module}s-table.tsx         # 表格组件
│   ├── {module}s-columns.tsx       # 列定义
│   ├── {module}s-primary-buttons.tsx  # 顶部按钮
│   └── {module}-delete-dialog.tsx  # 删除确认（AlertDialog）
├── hooks/use-{module}s.ts          # API hooks
├── types/{module}.ts               # Zod schema
└── index.tsx
```

## 核心代码模板

### 1. Context API 状态管理

```typescript
// {module}s-dialogs.tsx
import { useState, createContext, useContext } from "react";

interface ContextValue {
  openCreateDialog: () => void;
  openEditDialog: (item: Item) => void;
  openDeleteDialog: (item: Item) => void;
}

const Context = createContext<ContextValue | null>(null);

export function ModuleDialogs({ children, onRefresh }) {
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <Context.Provider value={{ openCreateDialog, openEditDialog, openDeleteDialog }}>
      {children}
      <ContactFormDrawer open={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={onRefresh} />
      {editingItem && <ContactFormDrawer open={!!editingItem} contact={editingItem} onSuccess={onRefresh} />}
      {deletingItem && <ContactDeleteDialog open={!!deletingItem} currentRow={deletingItem} onSuccess={onRefresh} />}
    </Context.Provider>
  );
}

export function useModuleDialogs() {
  const context = useContext(Context);
  if (!context) throw new Error("useModuleDialogs must be used within ModuleDialogs");
  return context;
}
```

### 2. 表单抽屉（Sheet）- **必须使用**

```typescript
// {module}-form-drawer.tsx
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";

const formSchema = z.object({
  name: z.string().min(1, "不能为空"),
  // ... 更多字段
});

interface FormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item;
  onSuccess: () => void;
}

export function ModuleFormDrawer({ open, onOpenChange, item, onSuccess }: FormDrawerProps) {
  const isEdit = !!item;
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: item || { name: "" },
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

**关键点**：
- 使用 `Sheet` 组件（shadcn/ui 的抽屉）
- 移动端用 `bottom`，桌面端用 `right/left`
- `useEffect` 在关闭时重置表单

### 3. API Hooks

```typescript
// hooks/use-{module}s.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getScrmApi } from "@/services/api";

export function useModules(params) {
  return useQuery({
    queryKey: ["modules", params],
    queryFn: async () => await getScrmApi().moduleControllerFindAll(params),
  });
}

export function useCreateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => await getScrmApi().moduleControllerCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast.success("创建成功");
    },
  });
}

// useUpdateModule, useDeleteModule 类似
```

**重要**：直接返回 API 调用结果，不要访问 `.data`

### 4. 表格组件

```typescript
// {module}s-table.tsx
export function ModuleTable({ search, navigate, onEdit, onDelete }) {
  const { columnFilters, pagination, onPaginationChange } = useTableUrlState({
    search, navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
  });

  const { data, isLoading } = useModules({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  });

  // ✅ 使用 data?.data
  const items = data?.data || [];
  const total = data?.total || 0;

  const table = useReactTable({
    data: items,
    columns,
    pageCount: Math.ceil(total / pagination.pageSize),
    manualPagination: true,
  });
}
```

### 5. 删除确认（AlertDialog）- **必须使用**

```typescript
// {module}-delete-dialog.tsx
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRow: Item;
  onSuccess: () => void;
}

export function ModuleDeleteDialog({ open, onOpenChange, currentRow, onSuccess }: DeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(currentRow.id);
      onSuccess();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
  );
}
```

**禁止使用** `window.confirm()`

## 后端模板

### Service（标准分页结构）

```typescript
@Injectable()
export class ModuleService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryDto) {
    const { page = 1, pageSize = 10, keyword } = query;
    const where = keyword ? { OR: [{ name: { contains: keyword } }] } : {};
    const total = await this.prisma.module.count({ where });
    const data = await this.prisma.module.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });

    // ✅ 标准分页结构
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
```

### Controller

```typescript
@ApiTags("modules")  // ✅ 必须使用英文
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("modules")
export class ModuleController {
  @Get()
  @ApiOperation({ summary: "查询列表" })
  findAll(@Query() query: QueryDto) {
    return this.moduleService.findAll(query);
  }
}
```

## 相关文档

- [分页响应规范](./pagination-response-standard.md)
- [故障排除指南](./troubleshooting.md)
