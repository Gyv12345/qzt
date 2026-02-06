# 联系人 CRUD 模板

本文档提供联系人模块的完整代码参考。开发新 CRUD 功能时，**复制联系人模块的文件结构**，然后修改内容。

## 文件复制指南

```bash
# 1. 复制联系人模块目录
cp -r frontend/src/features/contacts frontend/src/features/{new-module}

# 2. 批量替换文件名和内容
# 将 Contact → NewModule
# 将 contact → newModule
```

## 核心代码片段

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
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <Context.Provider value={{ openCreateDialog, openEditDialog, openDeleteDialog }}>
      {children}
      <FormDrawer open={isCreateOpen} />
      <FormDrawer item={editingItem} />
      <DeleteDialog item={deletingItem} />
    </Context.Provider>
  );
}

export function useModuleDialogs() {
  const context = useContext(Context);
  if (!context) throw new Error("useModuleDialogs must be used within ModuleDialogs");
  return context;
}
```

### 2. 表单抽屉（Sheet/Drawer）

```typescript
// {module}-form-drawer.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  name: z.string().min(1, "不能为空"),
  // ... 更多字段
});

export function ModuleFormDrawer({ open, onOpenChange, item, onSuccess }) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: item || { name: "" },
  });

  const createMutation = useCreateModule();
  const updateMutation = useUpdateModule();

  const onSubmit = async (values) => {
    if (item) {
      await updateMutation.mutateAsync({ id: item.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    onSuccess();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="min-w-[500px]">
        <SheetHeader>
          <SheetTitle>{item ? "编辑" : "新建"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>名称</FormLabel>
                <FormControl><Input {...field} /></FormControl>
              </FormItem>
            )} />
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
```

### 3. API Hooks

```typescript
// hooks/use-{module}s.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getScrmApi } from "@/services/api";

export function useModules(params) {
  return useQuery({
    queryKey: ["modules", params],
    queryFn: async () => {
      const { moduleControllerFindAll } = getScrmApi();
      return await moduleControllerFindAll(params);
    },
  });
}

export function useCreateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const { moduleControllerCreate } = getScrmApi();
      return await moduleControllerCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast.success("创建成功");
    },
  });
}

// useUpdateModule, useDeleteModule 类似
```

**重要**：直接返回 API 调用结果，不要访问 `.data`：

```typescript
// ✅ 正确
queryFn: async () => await getScrmApi().moduleControllerFindAll(params)

// ❌ 错误
queryFn: async () => {
  const response = await getScrmApi().moduleControllerFindAll(params);
  return response.data;  // undefined!
}
```

### 4. 表格组件

```typescript
// {module}s-table.tsx
export function ModuleTable({ search, navigate, onEdit, onDelete }) {
  const { columnFilters, pagination, onPaginationChange } = useTableUrlState({
    search, navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
  });

  const queryParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  };

  const { data, isLoading } = useModules(queryParams);

  // ✅ 使用 data?.data
  const items = data?.data || [];
  const total = data?.total || 0;

  const columns = useMemo(() => getColumns(), []);

  const table = useReactTable({
    data: items,
    columns,
    pageCount: Math.ceil(total / pagination.pageSize),
    manualPagination: true,
  });

  // ... 渲染表格
}
```

## 后端 Service 模板

```typescript
// {module}.service.ts
@Injectable()
export class ModuleService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDto, userId: string) {
    return await this.prisma.module.create({
      data: { ...dto, ownerUserId: userId },
    });
  }

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

    // ✅ 返回标准分页结构
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.module.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("不存在");
    return item;
  }

  async update(id: string, dto: UpdateDto) {
    return await this.prisma.module.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.prisma.module.delete({ where: { id } });
    return { message: "删除成功" };
  }
}
```

## 后端 Controller 模板

```typescript
// {module}.controller.ts
@ApiTags("modules")  // ✅ 使用英文
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("modules")
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Get()
  @ApiOperation({ summary: "查询列表" })
  findAll(@Query() query: QueryDto) {
    return this.moduleService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: "创建" })
  create(@Body() dto: CreateDto, @Request() req) {
    return this.moduleService.create(dto, req.user.userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取详情" })
  findOne(@Param("id") id: string) {
    return this.moduleService.findOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新" })
  update(@Param("id") id: string, @Body() dto: UpdateDto) {
    return this.moduleService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除" })
  remove(@Param("id") id: string) {
    return this.moduleService.remove(id);
  }
}
```

## 相关文档

- [分页响应统一规范](./pagination-response-standard.md)
- [故障排除指南](./troubleshooting.md)
