# CRUD 列表页标准设计

> 以联系人管理界面为模板，建立统一的 CRUD 列表页标准，其他模块参考此标准实现。

**创建日期：** 2025-02-05
**参考模块：** 联系人管理 (Contacts)

---

## 目录

1. [目录结构](#目录结构)
2. [页面头部结构](#页面头部结构)
3. [搜索交互设计](#搜索交互设计)
4. [表格列定义与 i18n](#表格列定义与-i18n)
5. [行内操作设计](#行内操作设计)
6. [详情抽屉设计](#详情抽屉设计)
7. [数据权限模型](#数据权限模型)
8. [导入导出功能](#导入导出功能)

---

## 目录结构

```
features/{module}/
├── components/
│   ├── {module}s-table.tsx              # 表格主组件
│   ├── {module}s-columns.tsx            # 列定义（含 i18n）
│   ├── {module}s-primary-buttons.tsx    # 顶部操作按钮组
│   ├── {module}s-dialogs.tsx            # 对话框/抽屉容器
│   ├── {module}-form-drawer.tsx         # 抽屉式表单（新增/编辑）
│   ├── {module}-detail-drawer.tsx       # 抽屉式详情
│   ├── data-table-row-actions.tsx       # 行内操作按钮
│   ├── data-table-export-import.tsx     # 导入导出组件
│   └── {module}-delete-dialog.tsx       # 删除确认对话框
├── hooks/
│   └── use-{module}s.ts                 # 数据获取 hooks
├── types/
│   └── {module}.ts                      # 类型 + Zod schema
└── index.tsx                            # 主页面
```

---

## 页面头部结构

### Header 标准配置

```tsx
<Header fixed>
  <Search />
  <div className='ms-auto flex items-center space-x-4'>
    <ThemeSwitch />
    <LanguageSwitch />
    <ConfigDrawer />        {/* 全局设置 */}
    <ProfileDropdown />
  </div>
</Header>
```

### 主页面标准模板

```tsx
export function Module() {
  return (
    <ModuleProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <LanguageSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* 标题区 */}
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>{t('module.title')}</h2>
            <p className='text-muted-foreground'>{t('module.description')}</p>
          </div>
          <ModulePrimaryButtons onAdd={openAddDrawer} onImport={openImport} />
        </div>

        {/* 表格区 */}
        <ModuleTable search={search} navigate={navigate} />
      </Main>

      <ModuleDialogs />
    </ModuleProvider>
  )
}
```

---

## 搜索交互设计

### 回车触发搜索模式

```tsx
// 新增 useSearchSubmit hook
const [searchValue, setSearchValue] = useState('')

// 回车或点击搜索按钮时才提交
const handleSearchSubmit = () => {
  onColumnFiltersChange([{ id: 'name', value: searchValue }])
}

<Input
  placeholder={t('module.searchPlaceholder')}
  value={searchValue}
  onChange={(e) => setSearchValue(e.target.value)}
  onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
  className='h-8 w-[150px] lg:w-[250px]'
/>
<Button size='sm' onClick={handleSearchSubmit}>
  <Search className='h-4 w-4 mr-1' />
  搜索
</Button>
```

---

## 表格列定义与 i18n

### 列定义标准格式

```tsx
// contacts-columns.tsx
import { useTranslation } from 'react-i18next'

export const contactsColumns = (): ColumnDef<Contact>[] => {
  const { t } = useTranslation()

  return [
    {
      accessorKey: 'name',
      // 使用 i18n 翻译
      header: () => t('contact.columns.name'),
      // 添加 meta 中的显示名称，供 ViewOptions 使用
      meta: {
        displayName: t('contact.columns.name'),  // ViewOptions 显示此名称
        className: 'w-[120px]',
      },
      cell: ({ row, getValue }) => (
        <Button
          variant="link"
          className="h-auto p-0"
          onClick={() => openDetailDrawer(row.original)}
        >
          {getValue()}
        </Button>
      ),
    },
    // ... 其他列
  ]
}
```

### DataTableViewOptions 修改

```tsx
// view-options.tsx
// 显示 meta.displayName 而非 column.id
<DropdownMenuCheckboxItem
  checked={column.getIsVisible()}
  onCheckedChange={(value) => column.toggleVisibility(!!value)}
>
  {column.columnDef.meta?.displayName || column.id}  {/* 优先使用翻译后的名称 */}
</DropdownMenuCheckboxItem>
```

---

## 行内操作设计

### 操作按钮布局

```tsx
// data-table-row-actions.tsx
export function DataTableRowActions({ row, onEdit, onDelete, onMore }: Props) {
  return (
    <div className="flex items-center gap-1">
      {/* 直接显示：编辑按钮 */}
      <Button size="sm" variant="ghost" onClick={() => onEdit(row.original)}>
        <Edit className="h-4 w-4" />
      </Button>

      {/* 直接显示：删除按钮 */}
      <Button size="sm" variant="ghost" onClick={() => onDelete(row.original)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>

      {/* 折叠：更多操作 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onLinkCustomer(row.original)}>
            <Link2 className="mr-2 h-4 w-4" />
            关联客户
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onViewCustomer(row.original)}>
            <Building2 className="mr-2 h-4 w-4" />
            查看企业
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

**注意：** 操作栏固定在表格最后一列，不参与列隐藏。

---

## 详情抽屉设计

### 抽屉组件结构

```tsx
// contact-detail-drawer.tsx
import { Drawer, DrawerContent, DrawerHeader } from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDirection } from '@/context/direction-provider'

export function ContactDetailDrawer({ open, onOpenChange, contact }: Props) {
  const { dir } = useDirection()  // 获取布局方向
  const isMobile = useMediaQuery('(max-width: 768px)')

  // PC: 根据方向决定左右，移动端: 底部
  const drawerDirection = isMobile ? 'bottom' : (dir === 'rtl' ? 'left' : 'right')

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={drawerDirection}>
      <DrawerContent className={isMobile ? 'h-[85vh]' : 'w-[600px]'}>
        <DrawerHeader>
          <h2 className="text-lg font-semibold">{contact?.name}</h2>
          <p className="text-sm text-muted-foreground">联系人详情</p>
        </DrawerHeader>

        <Tabs defaultValue="detail">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detail">详情</TabsTrigger>
            <TabsTrigger value="edit">快速编辑</TabsTrigger>
            <TabsTrigger value="actions">关联操作</TabsTrigger>
          </TabsList>

          {/* 详情标签页：只读展示 + 内联编辑 */}
          <TabsContent value="detail">
            <ContactDetailContent contact={contact} onInlineEdit={handleInlineEdit} />
          </TabsContent>

          {/* 快速编辑标签页：表单 */}
          <TabsContent value="edit">
            <ContactQuickEditForm contact={contact} onSave={handleSave} />
          </TabsContent>

          {/* 关联操作标签页 */}
          <TabsContent value="actions">
            <div className="space-y-2">
              <Button onClick={() => onLinkCustomer(contact)} className="w-full">
                <Link2 className="mr-2 h-4 w-4" />
                关联客户
              </Button>
              <Button onClick={() => onViewCustomer(contact)} className="w-full">
                <Building2 className="mr-2 h-4 w-4" />
                查看企业
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  )
}
```

### 内联编辑实现

```tsx
// 详情字段组件
function EditableField({ label, value, onSave }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  return (
    <div className="group flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input value={editValue} onChange={e => setEditValue(e.target.value)} />
          <Check onClick={() => { onSave(editValue); setIsEditing(false) }} />
        </div>
      ) : (
        <div
          className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
          onClick={() => setIsEditing(true)}
        >
          {value || '-'}
        </div>
      )}
    </div>
  )
}
```

---

## 数据权限模型

### 数据库 Schema 扩展

```prisma
// 联系人表增加负责人字段
model Contact {
  // ... 现有字段
  ownerUserId    String?
  ownerUser      User?     @relation("ContactOwner", fields: [ownerUserId], references: [id])
}

// 用户角色扩展数据权限范围
enum DataPermissionScope {
  ALL        // 查看所有数据
  TEAM       // 查看团队数据（同一部门/团队成员的数据）
  OWN        // 仅查看自己负责的数据
}

model Role {
  // ... 现有字段
  dataPermissionScope DataPermissionScope @default(OWN)
}

// 用户表增加团队/部门字段
model User {
  // ... 现有字段
  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id])
}

model Department {
  id       String @id @default(cuid())
  name     String
  users    User[]
}
```

### 可复用数据权限过滤器

```typescript
// common/filters/data-permission.service.ts
import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'

export enum DataPermissionScope {
  ALL = 'ALL',
  TEAM = 'TEAM',
  OWN = 'OWN',
}

@Injectable()
export class DataPermissionService {
  constructor(private prisma: PrismaService) {}

  /**
   * 根据用户角色获取数据权限过滤条件
   * 可复用于所有需要数据权限过滤的模块
   */
  async getPermissionFilter(
    user: User,
    ownerField: string = 'ownerUserId', // 可配置负责人字段名
  ): Promise<Prisma.Input<{ [key: string]: any }>> {
    const scope = user.role.dataPermissionScope

    switch (scope) {
      case DataPermissionScope.ALL:
        return {} // 无过滤

      case DataPermissionScope.TEAM:
        const teamMemberIds = await this.getTeamMemberIds(user.id)
        return {
          [ownerField]: { in: teamMemberIds }
        }

      case DataPermissionScope.OWN:
      default:
        return {
          [ownerField]: user.id
        }
    }
  }

  private async getTeamMemberIds(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { department: { include: { users: true } } }
    })
    return user?.department?.users.map(u => u.id) || [userId]
  }
}
```

### 使用示例

```typescript
// contacts.service.ts
async findAll(user: User, params: FindAllDto) {
  const where = await this.dataPermission.getPermissionFilter(user, 'ownerUserId')
  return this.prisma.contact.findMany({ where })
}
```

### 配置化角色权限

```typescript
// roles 初始化数据或管理后台配置
const roles = [
  { name: '超级管理员', dataPermissionScope: DataPermissionScope.ALL },
  { name: '销售经理', dataPermissionScope: DataPermissionScope.TEAM },
  { name: '销售人员', dataPermissionScope: DataPermissionScope.OWN },
]
```

---

## 导入导出功能

### 组件结构

```tsx
// data-table-export-import.tsx
export function DataTableExportImport({
  module, // 模块名，用于 i18n
  exportColumns, // 可导出的列定义
  onImportSuccess
}: Props) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  return (
    <>
      {/* 导出按钮 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => exportData('selected')}>
            导出选中行
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportData('currentPage')}>
            导出当前页
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
            高级导出...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 导入按钮 */}
      <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        导入
      </Button>

      {/* 高级导出对话框 */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        columns={exportColumns}
        onExport={handleAdvancedExport}
      />

      {/* 导入对话框 */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        module={module}
        onSuccess={onImportSuccess}
      />
    </>
  )
}
```

### 高级导出对话框

```tsx
// export-dialog.tsx
export function ExportDialog({ columns, onExport }: Props) {
  const [selectedColumns, setSelectedColumns] = useState(columns.map(c => c.id))
  const [exportRange, setExportRange] = useState<'all' | 'filtered' | 'selected'>('filtered')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>高级导出</DialogTitle>
        </DialogHeader>

        {/* 导出范围选择 */}
        <RadioGroup value={exportRange} onValueChange={setExportRange}>
          <RadioItem value="all">导出全部数据</RadioItem>
          <RadioItem value="filtered">导出筛选后的数据</RadioItem>
          <RadioItem value="selected">导出选中的行</RadioItem>
        </RadioGroup>

        {/* 列选择 */}
        <div className="space-y-2">
          <Label>选择导出字段</Label>
          <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
            {columns.map(col => (
              <Checkbox
                key={col.id}
                checked={selectedColumns.includes(col.id)}
                onChange={(checked) => toggleColumn(col.id, checked)}
              >
                {col.displayName}
              </Checkbox>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onExport({ range: exportRange, columns: selectedColumns })}>
            导出 Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 导入对话框（含字段映射）

```tsx
// import-dialog.tsx
export function ImportDialog({ module, onSuccess }: Props) {
  const [step, setStep] = useState(1) // 1: 上传 -> 2: 映射 -> 3: 预览
  const [file, setFile] = useState<File | null>(null)
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [previewData, setPreviewData] = useState([])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>导入数据</DialogTitle>
        </DialogHeader>

        {step === 1 && <UploadStep onFileSelected={(f) => { setFile(f); setStep(2) }} />}
        {step === 2 && <MappingStep file={file} onConfirm={(m) => { setFieldMapping(m); setStep(3) }} />}
        {step === 3 && <PreviewStep mapping={fieldMapping} onConfirm={handleImport} />}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 功能总结

| 功能点 | 标准方案 |
|--------|----------|
| **头部配置** | ConfigDrawer（全局设置）在 LanguageSwitch 旁 |
| **搜索触发** | 回车触发 + 搜索按钮（非输入即搜） |
| **列显示/隐藏** | DataTableToolbar 右侧 ViewOptions，显示 i18n 列名 |
| **行内操作** | 编辑 + 删除按钮直接显示，其余折叠到"更多" |
| **详情查看** | 点击姓名单元格打开抽屉 |
| **新增/编辑** | 使用抽屉（非模态框） |
| **抽屉方向** | PC: 根据布局方向（LTR/RTL），移动: 底部 |
| **详情内容** | 标签页（详情/快速编辑/关联操作）+ 内联编辑 |
| **数据权限** | DataPermissionService 过滤器（ALL/TEAM/OWN）+ 负责人字段 |
| **导入导出** | 全功能：选择范围/字段 + 字段映射 + 预览 + 历史 |
