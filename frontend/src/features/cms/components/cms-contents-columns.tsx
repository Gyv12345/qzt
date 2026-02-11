import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTableRowActions } from "./data-table-row-actions";
import {
  CONTENT_TYPE_CONFIG,
  CONTENT_STATUS_CONFIG,
  type ContentType,
  type ContentStatus,
} from "../types/cms";
import type { CmsContent } from "../types/cms";

type GetCmsContentsColumnsOptions = {
  t: (key: string) => string;
};

export function getCmsContentsColumns({
  t,
}: GetCmsContentsColumnsOptions): ColumnDef<CmsContent>[] {
  const formatContentType = (type: ContentType) => {
    return CONTENT_TYPE_CONFIG[type]?.label || type;
  };

  const formatContentStatus = (status: ContentStatus) => {
    return CONTENT_STATUS_CONFIG[status]?.label || status;
  };

  const getStatusColor = (status: ContentStatus) => {
    const colorMap: Record<ContentStatus, "default" | "outline" | "secondary"> =
      {
        DRAFT: "default",
        PUBLISHED: "outline",
        ARCHIVED: "secondary",
      };
    return colorMap[status] || "default";
  };

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      meta: {
        className: "w-[40px]",
      },
    },
    {
      accessorKey: "title",
      header: () => t("cms.content.columns.title"),
      meta: {
        displayName: t("cms.content.columns.title"),
        className: "w-[200px]",
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("title")}</div>
      ),
    },
    {
      accessorKey: "contentType",
      header: () => t("cms.content.columns.type"),
      meta: {
        displayName: t("cms.content.columns.type"),
        className: "w-[100px]",
      },
      cell: ({ row }) => {
        const type = row.getValue("contentType") as ContentType;
        return <Badge variant="outline">{formatContentType(type)}</Badge>;
      },
    },
    {
      accessorKey: "status",
      header: () => t("cms.content.columns.status"),
      meta: {
        displayName: t("cms.content.columns.status"),
        className: "w-[100px]",
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as ContentStatus;
        return (
          <Badge variant={getStatusColor(status)}>
            {formatContentStatus(status)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "author",
      header: () => t("cms.content.columns.author"),
      meta: {
        displayName: t("cms.content.columns.author"),
        className: "w-[120px]",
      },
      cell: ({ row }) => {
        const author = row.getValue("author") as { name?: string };
        return (
          <div className="text-muted-foreground">{author?.name || "-"}</div>
        );
      },
    },
    {
      accessorKey: "excerpt",
      header: () => t("cms.content.columns.excerpt"),
      meta: {
        displayName: t("cms.content.columns.excerpt"),
        className: "w-[250px]",
      },
      cell: ({ row }) => {
        const excerpt = row.getValue("excerpt") as string;
        return (
          <div className="max-w-[250px] truncate text-muted-foreground">
            {excerpt || "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "publishedAt",
      header: () => t("cms.content.columns.publishedAt"),
      meta: {
        displayName: t("cms.content.columns.publishedAt"),
        className: "w-[120px]",
      },
      cell: ({ row }) => {
        const publishedAt = row.getValue("publishedAt") as string | undefined;
        if (!publishedAt) return <div className="text-muted-foreground">-</div>;
        return (
          <div className="text-muted-foreground">
            {new Date(publishedAt).toLocaleDateString("zh-CN")}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: DataTableRowActions as any,
      enableHiding: false,
      meta: {
        displayName: t("cms.content.columns.actions"),
        className: "w-[150px]",
      },
    },
  ];
}
