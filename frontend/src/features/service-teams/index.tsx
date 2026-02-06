import { useState } from "react";
import { Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import { LanguageSwitch } from "@/components/language-switch";
import { ConfigDrawer } from "@/components/config-drawer";
import { Button } from "@/components/ui/button";
import { ServiceTeamsTable } from "./components/service-teams-table";
import { ServiceTeamFormDialog } from "./components/service-team-form-dialog";
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

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-medium">服务团队</h1>
        </div>
        <div className="ms-auto flex items-center space-x-4">
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            添加成员
          </Button>
          <Search />
          <ThemeSwitch />
          <LanguageSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <ServiceTeamsTable onEdit={handleEdit} />
      </Main>

      <ServiceTeamFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        editingRecord={editingRecord}
      />
    </>
  );
}
