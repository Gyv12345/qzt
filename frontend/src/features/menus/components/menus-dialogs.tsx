import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { MenuFormDrawer } from "./menu-form-drawer";
import type { MenuNode } from "../hooks/use-all-menus";

interface MenusDialogsContextValue {
  openEditDialog: (menu: MenuNode) => void;
  openCreateDialog: () => void;
  closeDialog: () => void;
}

const MenusDialogsContext = createContext<MenusDialogsContextValue | undefined>(
  undefined,
);

interface MenusDialogsProps {
  children: ReactNode;
  onRefresh?: () => void;
}

export function useMenusDialogs() {
  const context = useContext(MenusDialogsContext);
  if (!context) {
    throw new Error("useMenusDialogs must be used within MenusDialogs");
  }
  return context;
}

export function MenusDialogs({ children, onRefresh }: MenusDialogsProps) {
  const [editingMenu, setEditingMenu] = useState<MenuNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openEditDialog = useCallback((menu: MenuNode) => {
    setEditingMenu(menu);
    setDrawerOpen(true);
  }, []);

  const openCreateDialog = useCallback(() => {
    setEditingMenu(null);
    setDrawerOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDrawerOpen(false);
    setEditingMenu(null);
  }, []);

  const handleSuccess = useCallback(() => {
    closeDialog();
    if (onRefresh) {
      onRefresh();
    }
  }, [closeDialog, onRefresh]);

  return (
    <MenusDialogsContext.Provider
      value={{
        openEditDialog,
        openCreateDialog,
        closeDialog,
      }}
    >
      {children}
      <MenuFormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          } else {
            setDrawerOpen(true);
          }
        }}
        menu={editingMenu || undefined}
        onSuccess={handleSuccess}
      />
    </MenusDialogsContext.Provider>
  );
}
