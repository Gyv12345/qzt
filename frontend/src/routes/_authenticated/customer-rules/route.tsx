import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

function CustomerRulesPlaceholder() {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <ShieldCheck className="h-10 w-10 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="mt-4">客户规则</CardTitle>
          <CardDescription>
            配置客户管理规则、验证逻辑和业务约束
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            此功能正在开发中，敬请期待...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/customer-rules")({
  component: CustomerRulesPlaceholder,
});
