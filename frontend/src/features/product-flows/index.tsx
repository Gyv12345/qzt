import { GitBranch } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import { LanguageSwitch } from "@/components/language-switch";
import { ConfigDrawer } from "@/components/config-drawer";
import { ProductFlowsTable } from "./components/product-flows-table";

export function ProductFlowsPage() {
  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          <h1 className="text-lg font-medium">产品流程</h1>
        </div>
        <div className="ms-auto flex items-center space-x-4">
          <Search />
          <ThemeSwitch />
          <LanguageSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <ProductFlowsTable />
      </Main>
    </>
  );
}
