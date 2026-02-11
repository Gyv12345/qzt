import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    className?: string; // apply to both th and td
    tdClassName?: string;
    thClassName?: string;
    displayName?: string; // 列显示名称，用于表格视图切换
  }
}
