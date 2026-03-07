import { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Download, Trash2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDepartments } from "@/features/departments/hooks/use-departments";
import { useCreateUser } from "../hooks/use-users";
import { DepartmentTreeSelect } from "@/components/ui/department-tree-select";
import { roles } from "../data/data";

interface ParsedUser {
  username: string;
  name: string;
  email: string;
  phone: string;
  departmentName?: string;
  roleName?: string;
  valid: boolean;
  error?: string;
}

interface BatchAddDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UsersBatchAddDrawer({
  open,
  onOpenChange,
  onSuccess,
}: BatchAddDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [defaultDepartmentId, setDefaultDepartmentId] = useState<string>("");
  const [defaultRole, setDefaultRole] = useState<string>("");
  const [defaultPassword, setDefaultPassword] = useState<string>("");

  const { data: departmentsData } = useDepartments();
  const departments = departmentsData || [];

  const createUser = useCreateUser();

  // 解析 Excel/CSV 文件
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const XLSX = await import("xlsx");
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const users: ParsedUser[] = jsonData.map((row) => {
          const username = row["用户名"] || row["username"] || "";
          const name = row["姓名"] || row["name"] || "";
          const email = row["邮箱"] || row["email"] || "";
          const phone = row["电话"] || row["phone"] || row["phoneNumber"] || "";
          const departmentName = row["部门"] || row["department"] || "";
          const roleName = row["角色"] || row["role"] || "";

          // 验证
          const valid = !!(username && name && email);
          const error = !username
            ? "缺少用户名"
            : !name
              ? "缺少姓名"
              : !email
                ? "缺少邮箱"
                : "";

          return {
            username,
            name,
            email,
            phone,
            departmentName,
            roleName,
            valid,
            error,
          };
        });

        setParsedUsers(users);
        toast.success(`成功解析 ${users.length} 条用户数据`);
      } catch (error) {
        toast.error("文件解析失败，请检查文件格式");
        console.error(error);
      }
    },
    [],
  );

  // 删除用户
  const handleRemoveUser = (index: number) => {
    setParsedUsers((prev) => prev.filter((_, i) => i !== index));
  };

  // 查找部门ID
  const findDepartmentIdByName = (name: string): string | undefined => {
    if (!name) return undefined;

    function search(depts: any[]): string | undefined {
      for (const dept of depts) {
        if (dept.name === name) return dept.id;
        if (dept.children) {
          const found = search(dept.children);
          if (found) return found;
        }
      }
      return undefined;
    }

    return search(departments);
  };

  // 提交批量创建
  const handleSubmit = async () => {
    if (parsedUsers.length === 0) {
      toast.error("请先上传用户文件");
      return;
    }

    if (!defaultPassword) {
      toast.error("请设置默认密码");
      return;
    }

    const validUsers = parsedUsers.filter((u) => u.valid);
    if (validUsers.length === 0) {
      toast.error("没有有效的用户数据");
      return;
    }

    setIsSubmitting(true);
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const user of validUsers) {
      try {
        const departmentId =
          findDepartmentIdByName(user.departmentName || "") ||
          defaultDepartmentId ||
          undefined;
        const roleIds = user.roleName
          ? [
              roles.find(
                (r) => r.label === user.roleName || r.value === user.roleName,
              )?.value || defaultRole,
            ]
          : [defaultRole];

        await createUser.mutateAsync({
          username: user.username,
          name: user.name,
          email: user.email,
          phone: user.phone || undefined,
          password: defaultPassword,
          departmentId,
          roleIds,
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${user.username}: ${error.message || "创建失败"}`);
      }
    }

    setIsSubmitting(false);

    if (results.success > 0) {
      toast.success(
        `成功创建 ${results.success} 个用户${results.failed > 0 ? `，失败 ${results.failed} 个` : ""}`,
      );
      onSuccess();
      onOpenChange(false);
      handleReset();
    } else {
      toast.error("批量创建失败");
    }

    if (results.errors.length > 0) {
      console.error("批量创建错误详情:", results.errors);
    }
  };

  const handleReset = () => {
    setParsedUsers([]);
    setDefaultDepartmentId("");
    setDefaultRole("");
    setDefaultPassword("");
  };

  const validCount = parsedUsers.filter((u) => u.valid).length;
  const invalidCount = parsedUsers.length - validCount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>批量添加用户</SheetTitle>
          <SheetDescription>
            上传 Excel 或 CSV 文件批量创建用户账号
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4 max-h-[70vh] overflow-auto px-4">
          {/* 文件上传区 */}
          <div className="space-y-2">
            <Label>上传文件</Label>
            <div className="flex items-center gap-4">
              <label className="flex-1">
                <div className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-sm text-muted-foreground">
                    点击上传或拖拽文件到此处
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    支持 .xlsx, .xls, .csv 格式
                  </span>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={async () => {
                  // 下载模板逻辑
                  const XLSX = await import("xlsx");
                  const template = [
                    {
                      用户名: "zhangsan",
                      姓名: "张三",
                      邮箱: "zhangsan@example.com",
                      电话: "13800138000",
                      部门: "销售部",
                      角色: "sales",
                    },
                    {
                      用户名: "lisi",
                      姓名: "李四",
                      邮箱: "lisi@example.com",
                      电话: "13900139000",
                      部门: "技术部",
                      角色: "developer",
                    },
                  ];
                  const ws = XLSX.utils.json_to_sheet(template);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "用户模板");
                  XLSX.writeFile(wb, "用户导入模板.xlsx");
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 默认设置区 */}
          <div className="space-y-4 border-t pt-4">
            <Label className="text-base">默认设置</Label>

            <div className="space-y-2">
              <Label htmlFor="default-password">默认密码 *</Label>
              <Input
                id="default-password"
                type="password"
                placeholder="请输入默认密码"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-department">默认部门</Label>
              <DepartmentTreeSelect
                value={defaultDepartmentId}
                onChange={(v) => setDefaultDepartmentId(v || "")}
                departments={departments}
                placeholder="请选择默认部门"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-role">默认角色</Label>
              <Select value={defaultRole} onValueChange={setDefaultRole}>
                <SelectTrigger id="default-role">
                  <SelectValue placeholder="选择默认角色" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(({ label, value }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 解析结果预览 */}
          {parsedUsers.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">
                  解析结果 ({validCount} 有效, {invalidCount} 无效)
                </Label>
                {invalidCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setParsedUsers((prev) => prev.filter((u) => u.valid))
                    }
                  >
                    清除无效项
                  </Button>
                )}
              </div>

              <div className="border rounded-md max-h-48 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">用户名</th>
                      <th className="p-2 text-left">姓名</th>
                      <th className="p-2 text-left">邮箱</th>
                      <th className="p-2 text-left">部门</th>
                      <th className="p-2 text-left">角色</th>
                      <th className="p-2 text-left w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedUsers.map((user, index) => (
                      <tr
                        key={index}
                        className={cn(
                          "border-t",
                          !user.valid && "bg-destructive/10",
                        )}
                      >
                        <td className="p-2">{user.username || "-"}</td>
                        <td className="p-2">{user.name || "-"}</td>
                        <td className="p-2">{user.email || "-"}</td>
                        <td className="p-2">{user.departmentName || "-"}</td>
                        <td className="p-2">{user.roleName || "-"}</td>
                        <td className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemoveUser(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          {user.valid ? (
                            <CheckCircle className="h-4 w-4 text-green-500 inline-block ml-1" />
                          ) : (
                            <span title={user.error}>
                              <XCircle className="h-4 w-4 text-destructive inline-block ml-1" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="px-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              handleReset();
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              parsedUsers.length === 0 || isSubmitting || validCount === 0
            }
          >
            {isSubmitting ? "创建中..." : `创建 ${validCount} 个用户`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
