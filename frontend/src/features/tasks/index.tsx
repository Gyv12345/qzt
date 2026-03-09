import { Main } from "@/components/layout/main";
import { TasksDialogs } from "./components/tasks-dialogs";
import { TasksPrimaryButtons } from "./components/tasks-primary-buttons";
import { TasksProvider } from "./components/tasks-provider";
import { TasksTable } from "./components/tasks-table";
import { useTasks } from "./hooks/use-tasks";

export function Tasks() {
  const { data, isLoading, isError } = useTasks({
    page: 1,
    pageSize: 1000,
  });

  return (
    <TasksProvider>
      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
            <p className="text-muted-foreground">
              Here&apos;s a list of your tasks for this month!
            </p>
          </div>
          <TasksPrimaryButtons />
        </div>
        {isLoading ? (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            Loading tasks...
          </div>
        ) : isError ? (
          <div className="rounded-md border p-8 text-center text-destructive">
            Failed to load tasks.
          </div>
        ) : (
          <TasksTable data={data?.data || []} />
        )}
      </Main>

      <TasksDialogs />
    </TasksProvider>
  );
}
