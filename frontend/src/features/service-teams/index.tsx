import { useState } from "react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { ServiceTeamsTable } from "./components/service-teams-table";
import { ServiceTeamFormDrawer } from "./components/service-team-form-drawer";
import { CustomerServiceTeamTab } from "./components/customer-service-team-tab";

export { CustomerServiceTeamTab };

export function ServiceTeamsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingRecord(null);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };

  const handleSuccess = () => {
    handleFormClose();
    // 刷新表格数据
    window.location.reload();
  };

  return (
    <>
      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div className="flex justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">服务团队</h2>
            <p className="text-muted-foreground">管理客户服务团队成员分配</p>
          </div>
          <Button onClick={handleAdd}>添加成员</Button>
        </div>

        <ServiceTeamsTable onEdit={handleEdit} />
      </Main>

      <ServiceTeamFormDrawer
        open={formOpen}
        onOpenChange={handleFormClose}
        editingRecord={editingRecord}
        onSuccess={handleSuccess}
      />
    </>
  );
}
