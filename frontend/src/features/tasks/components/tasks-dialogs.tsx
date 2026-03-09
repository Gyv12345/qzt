import { ConfirmDialog } from "@/components/confirm-dialog";
import { TasksImportDialog } from "./tasks-import-dialog";
import { TasksMutateDrawer } from "./tasks-mutate-drawer";
import { useTasks } from "./tasks-provider";
import { useDeleteTask } from "../hooks/use-tasks";

export function TasksDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useTasks();
  const deleteMutation = useDeleteTask();
  return (
    <>
      <TasksMutateDrawer
        key="task-create"
        open={open === "create"}
        onOpenChange={() => setOpen("create")}
      />

      <TasksImportDialog
        key="tasks-import"
        open={open === "import"}
        onOpenChange={() => setOpen("import")}
      />

      {currentRow && (
        <>
          <TasksMutateDrawer
            key={`task-update-${currentRow.id}`}
            open={open === "update"}
            onOpenChange={() => {
              setOpen("update");
              setTimeout(() => {
                setCurrentRow(null);
              }, 500);
            }}
            currentRow={currentRow}
          />

          <ConfirmDialog
            key="task-delete"
            destructive
            open={open === "delete"}
            onOpenChange={() => {
              setOpen("delete");
              setTimeout(() => {
                setCurrentRow(null);
              }, 500);
            }}
            handleConfirm={() => {
              deleteMutation.mutate(currentRow.id, {
                onSuccess: () => {
                  setOpen(null);
                  setTimeout(() => {
                    setCurrentRow(null);
                  }, 500);
                },
              });
            }}
            className="max-w-md"
            title={`Delete this task: ${currentRow.id} ?`}
            desc={
              <>
                You are about to delete a task with the ID{" "}
                <strong>{currentRow.id}</strong>. <br />
                This action cannot be undone.
              </>
            }
            confirmText="Delete"
          />
        </>
      )}
    </>
  );
}
