import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Settings, MessageSquare, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SystemConfig {
  key: string
  configKey: string
  configValue: string
  description: string
  updatedAt: string
}

interface CommonPhrase {
  key: string
  category: string
  content: string
  updatedAt: string
}

interface PaymentAccount {
  key: string
  accountName: string
  accountNumber: string
  bankName: string
  accountType: string
  status: string
}

const configData: SystemConfig[] = [
  {
    key: '1',
    configKey: 'system.name',
    configValue: '企账通',
    description: '系统名称',
    updatedAt: '2024-01-01 12:00:00',
  },
]

const phraseData: CommonPhrase[] = [
  {
    key: '1',
    category: '问候',
    content: '您好，请问有什么可以帮您？',
    updatedAt: '2024-01-01 12:00:00',
  },
]

const accountData: PaymentAccount[] = [
  {
    key: '1',
    accountName: '公司账户',
    accountNumber: '6222021234567890',
    bankName: '工商银行',
    accountType: '对公账户',
    status: '启用',
  },
]

export function SystemPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">系统管理</h1>
        <p className="text-sm text-muted-foreground mt-1">管理系统配置、常用语和收款账户</p>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            系统配置
          </TabsTrigger>
          <TabsTrigger value="phrase" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            常用语
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            收款账户
          </TabsTrigger>
        </TabsList>

        {/* 系统配置 */}
        <TabsContent value="config" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">系统配置</h2>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              新增配置
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>配置键</TableHead>
                  <TableHead>配置值</TableHead>
                  <TableHead>说明</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  configData.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell className="font-mono text-sm">{item.configKey}</TableCell>
                      <TableCell>{item.configValue}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-muted-foreground">{item.updatedAt}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 常用语 */}
        <TabsContent value="phrase" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">常用语管理</h2>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              新增常用语
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>分类</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phraseData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  phraseData.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell>
                        <Badge variant="secondary">{item.category}</Badge>
                      </TableCell>
                      <TableCell>{item.content}</TableCell>
                      <TableCell className="text-muted-foreground">{item.updatedAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 收款账户 */}
        <TabsContent value="account" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">收款账户管理</h2>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              新增账户
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>账户名称</TableHead>
                  <TableHead>账号</TableHead>
                  <TableHead>开户行</TableHead>
                  <TableHead>账户类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  accountData.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell className="font-medium">{item.accountName}</TableCell>
                      <TableCell className="font-mono text-sm">{item.accountNumber}</TableCell>
                      <TableCell>{item.bankName}</TableCell>
                      <TableCell>{item.accountType}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === '启用' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
