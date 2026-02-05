# 2025-02-04 部门管理模块开发会话

## 📋 会话概览

**日期**: 2025-02-04
**主要任务**: 部门管理模块完整开发
**涉及模块**: 部门 CRUD、树形表格、搜索功能

## 🎯 完成的功能

### 1. Context Provider 问题修复

**问题描述**:
```
Error: useUsers has to be used within <UsersContext>
Error: useSearch has to be used within SearchProvider
```

**根本原因**: React Context 在热重载(HMR)时 context 实例不一致

**解决方案**:
```typescript
// ✅ 正确的 Context 模式
const Context = createContext<ContextType | undefined>(undefined)
const value = useMemo(() => ({ ...deps }), [deps])
if (context === undefined) throw new Error(...)
```

**修改文件**:
- `frontend/src/features/users/components/users-provider.tsx`
- `frontend/src/context/search-provider.tsx`

**关键点**:
- 使用 `undefined` 而不是 `null` 作为默认值
- 使用 `useMemo` 包裹 context value
- 检查 `context === undefined` 而不是 `!context`

### 2. 后端响应拦截器修复

**问题描述**:
- 分页响应被错误提取，`{ data: [], total, page }` 变成了 `[]`
- 前端表格无法显示数据

**解决方案**:

**后端** (`backend/src/common/interceptors/transform.interceptor.ts`):
```typescript
// 检查是否是分页响应（包含 data, total, page 等字段）
const isPaginatedResponse =
  data &&
  typeof data === 'object' &&
  'data' in data &&
  ('total' in data || 'page' in data || 'pageSize' in data || 'totalPages' in data)

// 分页响应不提取 data 字段，保留完整结构
if (isPaginatedResponse) {
  return {
    success: true,
    statusCode: context.switchToHttp().getResponse().statusCode,
    message: data?.message || '操作成功',
    data: data,  // 保留完整的分页对象
    timestamp: new Date().toISOString(),
    requestId,
  };
}
```

**前端** (`frontend/src/services/api-client.ts`):
```typescript
// 检查 data 字段是否是分页响应
const isPaginatedResponse =
  isStandardResponse &&
  responseData.data &&
  typeof responseData.data === 'object' &&
  'data' in responseData.data &&
  ('total' in responseData.data || 'page' in responseData.data)

// 如果是分页响应，提取 data.data（分页对象）
if (isPaginatedResponse) {
  response.data = responseData.data
}
```

### 3. 用户管理模块

**修改内容**:
- ✅ 隐藏侧边栏的"页面"和"其他"导航组
- ✅ 用户列表正常显示数据

**文件**: `frontend/src/components/layout/data/sidebar-data.ts`

### 4. 部门管理模块开发

#### 4.1 树形表格组件（手写实现）

**文件**: `frontend/src/features/departments/components/department-tree-table.tsx`

**核心功能**:
```typescript
// 递归渲染表格行
const renderRows = (nodes: DepartmentNode[], level: number = 0) => {
  return nodes.flatMap((node) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedIds.has(node.id)

    const rows = [
      <TableRow key={node.id}>
        <TableCell>
          <div style={{ paddingLeft: `${level * 24}px` }}>
            {hasChildren && (
              <button onClick={() => toggleExpand(node.id)}>
                {isExpanded ? <ChevronDown /> : <ChevronRight />}
              </button>
            )}
            <span>{node.name}</span>
          </div>
        </TableCell>
      </TableRow>,
    ]

    if (isExpanded && hasChildren) {
      rows.push(...renderRows(node.children!, level + 1))
    }

    return rows
  })
}
```

**特点**:
- ✅ 树形结构展示（层级缩进）
- ✅ 展开/收起功能（点击箭头图标）
- ✅ 部门名称（带图标和系统标识）
- ✅ 排序号、状态、创建时间
- ✅ 操作按钮（编辑/删除）

#### 4.2 添加部门对话框

**文件**: `frontend/src/features/departments/components/department-dialog.tsx`

**核心功能**:
```typescript
// 支持创建和编辑两种模式
const isEdit = !!editingDepartment

// 表单验证
const departmentSchema = z.object({
  name: z.string().min(1, '部门名称不能为空'),
  parentId: z.string().optional(),
  sort: z.number().min(0, '排序必须大于等于0'),
  status: z.number().min(0).max(1),
})
```

**特点**:
- ✅ React Hook Form + Zod 表单验证
- ✅ 支持选择上级部门（树形结构平铺显示）
- ✅ Switch 组件控制启用状态
- ✅ 编辑时排除自己和子部门作为上级
- ✅ 成功后自动关闭并重置表单

**特殊处理**:
```typescript
// Radix UI Select 不支持空字符串 value
const ROOT_PARENT_ID = '__root__'

// 提交时转换为 undefined
const parentId = data.parentId === ROOT_PARENT_ID ? undefined : data.parentId
```

#### 4.3 编辑功能

**实现方式**:
```typescript
// 点击编辑按钮
const handleEdit = (department: DepartmentNode) => {
  setEditingDepartment(department)
  setDialogOpen(true)
}

// 对话框检测编辑模式
useEffect(() => {
  if (editingDepartment) {
    form.reset({
      name: editingDepartment.name,
      parentId: editingDepartment.parentId || undefined,
      sort: editingDepartment.sort,
      status: editingDepartment.status,
    })
  }
}, [editingDepartment, form])
```

**特点**:
- ✅ 点击"编辑"打开对话框并自动填充数据
- ✅ 上级部门选择排除自己和子部门
- ✅ 提交时调用 `updateDepartment`
- ✅ 成功后刷新列表

#### 4.4 删除功能

**实现方式**:
```typescript
// 删除确认对话框
<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>确认删除</AlertDialogTitle>
      <AlertDialogDescription>
        确定要删除部门"{deletingDepartment?.name}"吗？
        {deletingDepartment?.isSystem && (
          <div className="text-destructive">系统部门不能删除</div>
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogAction
        onClick={confirmDelete}
        disabled={deletingDepartment?.isSystem}
        className="bg-orange-600 text-white hover:bg-orange-700"
      >
        确认删除
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**特点**:
- ✅ 删除前显示确认对话框
- ✅ 系统部门删除按钮禁用
- ✅ 橙色按钮（更友好的警告色）
- ✅ 删除中显示加载状态

#### 4.5 前端模糊搜索功能

**实现方式**:
```typescript
// 使用 useMemo 优化性能
const { filteredTreeData, autoExpandedIds } = useMemo(() => {
  if (!searchKeyword.trim()) {
    return { filteredTreeData: treeData, autoExpandedIds: new Set<string>() }
  }

  const filterNodes = (nodes: DepartmentNode[]): DepartmentNode[] => {
    const filtered: DepartmentNode[] = []
    const expandedIds = new Set<string>()

    nodes.forEach((node) => {
      const nodeCopy = { ...node }
      const isMatch = node.name.toLowerCase().includes(searchKeyword.toLowerCase())
      const filteredChildren = node.children ? filterNodes(node.children) : []

      if (isMatch || filteredChildren.length > 0) {
        nodeCopy.children = filteredChildren
        filtered.push(nodeCopy)

        // 如果有匹配的子节点，标记需要展开
        if (filteredChildren.length > 0) {
          expandedIds.add(node.id)
        }
      }
    })

    return { nodes: filtered, expandedIds }
  }

  const result = filterNodes(treeData || [])
  const allExpandedIds = collectExpandedIds(result.nodes, result.expandedIds)

  return {
    filteredTreeData: result.nodes,
    autoExpandedIds: allExpandedIds,
  }
}, [treeData, searchKeyword])

// 自动展开搜索结果
useEffect(() => {
  if (searchKeyword.trim() && autoExpandedIds.size > 0) {
    setExpandedIds(autoExpandedIds)
  } else if (!searchKeyword.trim()) {
    setExpandedIds(new Set())
  }
}, [searchKeyword, autoExpandedIds])
```

**特点**:
- ✅ 实时搜索（输入即过滤）
- ✅ 模糊匹配（不区分大小写）
- ✅ 保持树形结构
- ✅ 子节点匹配时保留父节点
- ✅ 自动展开包含匹配结果的路径
- ✅ 清空搜索时恢复完整列表

**性能优化**:
- ✅ 使用 `useMemo` 缓存过滤结果
- ✅ 避免重复计算
- ✅ 适合部门数量 < 500 的场景

## 🔍 技术决策

### 为什么使用纯前端搜索？

**决策**: 部门管理使用纯前端搜索过滤

**理由**:
1. ✅ 部门数量通常不多（几十到几百个）
2. ✅ 树形结构数据量有限
3. ✅ 响应速度快（无需等待网络请求）
4. ✅ 实时搜索体验更好
5. ✅ 减轻服务器负担

**不适用场景**:
- ❌ 数据量 > 1000
- ❌ 需要复杂查询条件
- ❌ 需要多字段组合搜索

### 为什么手写树形表格？

**决策**: 手写树形表格组件，不使用第三方库

**理由**:
1. ✅ 完全控制实现
2. ✅ 无额外依赖
3. ✅ 轻量级
4. ✅ 满足当前需求

**如果需要更多功能**（如拖拽排序、懒加载等），可考虑：
- `@tanstack/react-table` 扩展
- `react-tree-table-2`
- `rc-tree-table`

## 📁 修改的文件清单

### 前端

#### Context Provider 修复
- `frontend/src/features/users/components/users-provider.tsx`
- `frontend/src/context/search-provider.tsx`

#### API 客户端
- `frontend/src/services/api-client.ts`

#### 部门管理
- `frontend/src/features/departments/index.tsx` (更新)
- `frontend/src/features/departments/components/department-tree-table.tsx` (新建)
- `frontend/src/features/departments/components/department-dialog.tsx` (新建)
- `frontend/src/features/departments/hooks/use-departments.ts` (更新)

#### 侧边栏
- `frontend/src/components/layout/data/sidebar-data.ts` (注释导航组)

### 后端

- `backend/src/common/interceptors/transform.interceptor.ts` (修复分页响应处理)

## 🎓 经验总结

### 1. Context Provider 最佳实践

```typescript
// ✅ 正确模式
const Context = createContext<ContextType | undefined>(undefined)

export function Provider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialState)

  const value = useMemo(
    () => ({ state, setState }),
    [state]
  )

  return <Context value={value}>{children}</Context>
}

export const useContext = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useContext must be used within Provider')
  }
  return context
}
```

### 2. 分页响应处理模式

**后端**: 检测并保留分页结构
**前端**: 检测并提取分页对象
**关键**: 一致的数据格式约定

### 3. 树形结构处理技巧

**平铺树形结构**:
```typescript
const flattenTree = (nodes, level = 0) => {
  return nodes.flatMap(node => [
    { ...node, level },
    ...(node.children ? flattenTree(node.children, level + 1) : [])
  ])
}
```

**过滤树形结构**:
```typescript
const filterTree = (nodes, predicate) => {
  return nodes.flatMap(node => {
    const filteredChildren = node.children ? filterTree(node.children, predicate) : []
    if (predicate(node) || filteredChildren.length > 0) {
      return [{ ...node, children: filteredChildren }]
    }
    return []
  })
}
```

### 4. 搜索 UX 最佳实践

- ✅ 实时搜索（输入即显示结果）
- ✅ 模糊匹配（不区分大小写）
- ✅ 保持层级关系
- ✅ 自动展开匹配路径
- ✅ 清空时恢复原状态
- ✅ 无结果时友好提示

### 5. 删除操作的 UX

- ✅ 二次确认（AlertDialog）
- ✅ 显示影响的资源名称
- ✅ 系统数据保护（禁用删除）
- ✅ 友好的警告色（橙色而非红色）
- ✅ 加载状态反馈

## 🐛 遇到的问题

### 问题 1: Radix UI Select 不支持空字符串 value

**错误**:
```
Error: A <Select.Item /> must have a value prop that is not an empty string
```

**解决**: 使用特殊值代替空字符串
```typescript
const ROOT_PARENT_ID = '__root__'
<SelectItem value={ROOT_PARENT_ID}>无上级部门</SelectItem>

// 提交时转换
const parentId = data.parentId === ROOT_PARENT_ID ? undefined : data.parentId
```

### 问题 2: Dialog 缺少 Description

**警告**:
```
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}
```

**解决**: 添加 DialogDescription
```typescript
<DialogHeader>
  <DialogTitle>添加部门</DialogTitle>
  <DialogDescription>
    填写部门信息并选择上级部门（可选）
  </DialogDescription>
</DialogHeader>
```

## 📊 数据流

### 部门管理数据流

```
后端 DepartmentService.findTree()
  ↓ (返回树形结构)
前端 useDepartments()
  ↓ (获取树形数据)
DepartmentTreeTable
  ↓ (过滤/搜索)
renderRows()
  ↓ (递归渲染)
表格展示
```

### CRUD 操作数据流

```
创建/编辑:
DepartmentDialog → useCreateDepartment/useUpdateDepartment
  ↓ (API 调用)
后端 → 返回结果
  ↓ (invalidateQueries)
前端 → 自动刷新列表

删除:
AlertDialog → useDeleteDepartment
  ↓ (API 调用)
后端 → 返回结果
  ↓ (invalidateQueries)
前端 → 自动刷新列表
```

## ✅ 验证清单

- [x] Context Provider 错误修复
- [x] 分页响应拦截器修复
- [x] 用户列表正常显示
- [x] 部门树形表格展示
- [x] 展开/收起功能
- [x] 添加部门功能
- [x] 编辑部门功能
- [x] 删除部门功能（含确认）
- [x] 模糊搜索功能
- [x] 系统部门保护
- [x] 前端表单验证
- [x] 后端业务逻辑验证
- [x] 错误处理和提示
- [x] 加载状态反馈

## 🔄 下一步计划

建议后续功能：
- [ ] 部门拖拽排序
- [ ] 批量操作（批量删除、批量移动）
- [ ] 部门成员管理
- [ ] 部门权限设置
- [ ] 导出部门结构

## 📝 备注

- 所有时间使用中文简体
- 技术术语保持英文
- 代码注释使用中文
- 遵循项目现有代码风格
