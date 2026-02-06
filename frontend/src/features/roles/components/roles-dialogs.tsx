import { useState, createContext, useContext } from "react";
import { RoleFormDrawer } from "./role-form-drawer";
import { RoleDeleteDialog } from "./role-delete-dialog";
import type { Role } from "../data/schema";

interface RolesDialogsContextValue {
  openCreateDialog: () => void;
  openEditDialog: (role: Role) => void;
  openDeleteDialog: (role: Role) => void;
}

const RolesDialogsContext = createContext<RolesDialogsContextValue | null>(
  null,
);

interface RolesDialogsProps {
  children: React.ReactNode;
  onRefresh: () => void;
}

export function RolesDialogs({ children, onRefresh }: RolesDialogsProps) {
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const openCreateDialog = () => setIsCreateDialogOpen(true);
  const openEditDialog = (role: Role) => setEditingRole(role);
  const openDeleteDialog = (role: Role) => setDeletingRole(role);

  return (
    <RolesDialogsContext.Provider
      value={{
        openCreateDialog,
        openEditDialog,
        openDeleteDialog,
      }}
    >
      {children}

      {/* 创建角色抽屉 */}
      <RoleFormDrawer
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          onRefresh();
        }}
      />

      {/* 编辑角色抽屉 */}
      {editingRole && (
        <RoleFormDrawer
          open={!!editingRole}
          onOpenChange={(open) => !open && setEditingRole(null)}
          role={editingRole}
          onSuccess={() => {
            setEditingRole(null);
            onRefresh();
          }}
        />
      )}

      {/* 删除角色对话框 */}
      {deletingRole && (
        <RoleDeleteDialog
          open={!!deletingRole}
          onOpenChange={(open) => {
            if (!open) setDeletingRole(null);
          }}
          currentRow={deletingRole}
          onSuccess={() => {
            setDeletingRole(null);
            onRefresh();
          }}
        />
      )}
    </RolesDialogsContext.Provider>
  );
}

export function useRolesDialogs() {
  const context = useContext(RolesDialogsContext);
  if (!context) {
    throw new Error("useRolesDialogs must be used within RolesDialogs");
  }
  return context;
}
