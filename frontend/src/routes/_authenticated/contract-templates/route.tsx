import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileSignature } from "lucide-react";

function ContractTemplatesPlaceholder() {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <FileSignature className="h-10 w-10 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="mt-4">合同模板设置</CardTitle>
          <CardDescription>管理合同模板、条款配置和默认设置</CardDescription>
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

export const Route = createFileRoute("/_authenticated/contract-templates")({
  component: ContractTemplatesPlaceholder,
});
