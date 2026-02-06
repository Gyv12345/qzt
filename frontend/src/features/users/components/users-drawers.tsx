import { UsersFormDrawer } from "./users-form-drawer";
import { UsersDeleteDialog } from "./users-delete-dialog";
import { UsersBatchAddDrawer } from "./users-batch-add-drawer";
import { useUsers } from "./users-provider";

export function UsersDrawers() {
  const { open, setOpen, currentRow, setCurrentRow } = useUsers();
  return (
    <>
      <UsersFormDrawer
        key="user-add"
        open={open === "add"}
        onOpenChange={() => setOpen("add")}
      />

      <UsersBatchAddDrawer
        key="user-batch-add"
        open={open === "batchAdd"}
        onOpenChange={() => setOpen("batchAdd")}
        onSuccess={() => {
          // 刷新列表的逻辑
          window.location.reload();
        }}
      />

      {currentRow && (
        <>
          <UsersFormDrawer
            key={`user-edit-${currentRow.id}`}
            open={open === "edit"}
            onOpenChange={() => {
              setOpen("edit");
              setTimeout(() => {
                setCurrentRow(null);
              }, 500);
            }}
            currentRow={currentRow}
          />

          <UsersDeleteDialog
            key={`user-delete-${currentRow.id}`}
            open={open === "delete"}
            onOpenChange={() => {
              setOpen("delete");
              setTimeout(() => {
                setCurrentRow(null);
              }, 500);
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  );
}
