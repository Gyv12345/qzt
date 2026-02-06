import { useState } from "react";
import { Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import { LanguageSwitch } from "@/components/language-switch";
import { ConfigDrawer } from "@/components/config-drawer";
import { Button } from "@/components/ui/button";
import { ProductPackagesTable } from "./components/product-packages-table";
import { ProductPackageFormDialog } from "./components/product-package-form-dialog";
import { PackageProductsDialog } from "./components/package-products-dialog";

export function ProductPackagesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [managingPackage, setManagingPackage] = useState<any>(null);

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleManageProducts = (record: any) => {
    setManagingPackage(record);
    setProductsDialogOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingRecord(null);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-medium">产品套餐</h1>
        </div>
        <div className="ms-auto flex items-center space-x-4">
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            创建套餐
          </Button>
          <Search />
          <ThemeSwitch />
          <LanguageSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <ProductPackagesTable
          onEdit={handleEdit}
          onManageProducts={handleManageProducts}
        />
      </Main>

      <ProductPackageFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        editingRecord={editingRecord}
      />

      {managingPackage && (
        <PackageProductsDialog
          open={productsDialogOpen}
          onOpenChange={setProductsDialogOpen}
          packageId={managingPackage.id}
          packageName={managingPackage.name}
        />
      )}
    </>
  );
}
