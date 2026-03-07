import React, { useState } from "react";
import useDialogState from "@/hooks/use-dialog-state";
import type { UserEntity } from "@/models";

type UsersDialogType = "add" | "edit" | "delete" | "batchAdd";

type UsersContextType = {
  open: UsersDialogType | null;
  setOpen: (str: UsersDialogType | null) => void;
  currentRow: UserEntity | null;
  setCurrentRow: React.Dispatch<React.SetStateAction<UserEntity | null>>;
};

// 创建一个带有默认值的 context 以避免 null 问题
const UsersContext = React.createContext<UsersContextType | undefined>(
  undefined,
);

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<UsersDialogType>(null);
  const [currentRow, setCurrentRow] = useState<UserEntity | null>(null);

  // 使用 useMemo 确保 context 值的稳定性
  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      currentRow,
      setCurrentRow,
    }),
    [open, currentRow],
  );

  return <UsersContext value={value}>{children}</UsersContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useUsers = () => {
  const usersContext = React.useContext(UsersContext);

  if (usersContext === undefined) {
    throw new Error("useUsers has to be used within <UsersProvider>");
  }

  return usersContext;
};
