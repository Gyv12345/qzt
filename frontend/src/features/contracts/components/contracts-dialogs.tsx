import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { ContractFormDrawer } from "./contract-form-drawer";
import type { Contract } from "../types/contract";

interface ContractsDialogsContextType {
  openCreateDialog: () => void;
  openEditDialog: (contract: Contract) => void;
  closeDialog: () => void;
}

const ContractsDialogsContext = createContext<
  ContractsDialogsContextType | undefined
>(undefined);

interface ContractsDialogsProviderProps {
  children: ReactNode;
  onRefresh: () => void;
}

export function ContractsDialogsProvider({
  children,
  onRefresh,
}: ContractsDialogsProviderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>(
    undefined,
  );

  const openCreateDialog = useCallback(() => {
    setEditingContract(undefined);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((contract: Contract) => {
    setEditingContract(contract);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingContract(undefined);
  }, []);

  return (
    <ContractsDialogsContext.Provider
      value={{ openCreateDialog, openEditDialog, closeDialog }}
    >
      {children}
      <ContractFormDrawer
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contract={editingContract}
        onSuccess={() => {
          onRefresh();
          closeDialog();
        }}
      />
    </ContractsDialogsContext.Provider>
  );
}

export function useContractsDialogs() {
  const context = useContext(ContractsDialogsContext);
  if (!context) {
    throw new Error(
      "useContractsDialogs must be used within ContractsDialogsProvider",
    );
  }
  return context;
}

// 导出别名以便统一命名
export { ContractsDialogsProvider as ContractsDialogs };
