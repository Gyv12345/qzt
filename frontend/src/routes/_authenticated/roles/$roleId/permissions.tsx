import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Main } from "@/components/layout/main";
import { RolePermissionsContent } from "@/features/roles/components/role-permissions-content";

export const Route = createFileRoute(
  "/_authenticated/roles/$roleId/permissions",
)({
  component: RolePermissionsPage,
});

function RolePermissionsPage() {
  const navigate = useNavigate();
  const { roleId } = Route.useParams();

  const handleBack = () => {
    navigate({ to: "/roles" });
  };

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">角色权限配置</h2>
          <p className="text-muted-foreground">配置角色的菜单权限和数据权限</p>
        </div>
      </div>
      <RolePermissionsContent roleId={roleId} />
    </Main>
  );
}
