import { Main } from "@/components/layout/main";
import { PermissionTreeTable } from "./components/permission-tree-table";

export function Permissions() {
  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">权限管理</h1>
      </div>

      <PermissionTreeTable />
    </Main>
  );
}
