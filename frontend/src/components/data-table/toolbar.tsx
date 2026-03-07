import { Cross2Icon } from "@radix-ui/react-icons";
import { Search as SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFacetedFilter } from "./faceted-filter";
import { DataTableViewOptions } from "./view-options";

type DataTableToolbarProps<TData> = {
  table: Table<TData>;
  searchPlaceholder?: string;
  searchKey?: string;
  searchMode?: "instant" | "submit";
  searchButtonLabel?: string;
  filters?: {
    columnId: string;
    title: string;
    options: {
      label: string;
      value: string;
      icon?: React.ComponentType<{ className?: string }>;
    }[];
  }[];
  actions?: React.ReactNode;
};

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = "Filter...",
  searchKey,
  searchMode = "instant",
  searchButtonLabel = "搜索",
  filters = [],
  actions,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 || table.getState().globalFilter;

  const activeSearchValue = useMemo(() => {
    if (searchKey) {
      return (table.getColumn(searchKey)?.getFilterValue() as string) ?? "";
    }
    return (table.getState().globalFilter as string) ?? "";
  }, [searchKey, table]);

  const [searchValue, setSearchValue] = useState(activeSearchValue);

  useEffect(() => {
    setSearchValue(activeSearchValue);
  }, [activeSearchValue]);

  const handleSearchSubmit = () => {
    if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue(searchValue);
      return;
    }
    table.setGlobalFilter(searchValue);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder={searchPlaceholder}
            value={searchMode === "submit" ? searchValue : activeSearchValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (searchMode === "submit") {
                setSearchValue(nextValue);
                return;
              }
              if (searchKey) {
                table.getColumn(searchKey)?.setFilterValue(nextValue);
                return;
              }
              table.setGlobalFilter(nextValue);
            }}
            onKeyDown={(event) => {
              if (searchMode === "submit" && event.key === "Enter") {
                event.preventDefault();
                handleSearchSubmit();
              }
            }}
            className="h-8 w-[150px] lg:w-[250px]"
          />
          {searchMode === "submit" && (
            <Button size="sm" onClick={handleSearchSubmit}>
              <SearchIcon className="mr-1 h-4 w-4" />
              {searchButtonLabel}
            </Button>
          )}
        </div>
        <div className="flex gap-x-2">
          {filters.map((filter) => {
            const column = table.getColumn(filter.columnId);
            if (!column) return null;
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                options={filter.options}
              />
            );
          })}
        </div>
        {actions}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              table.setGlobalFilter("");
              setSearchValue("");
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ms-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
