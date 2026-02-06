import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Main } from "@/components/layout/main";
import { ProductsPrimaryButtons } from "./components/products-primary-buttons";
import { ProductsTable } from "./components/products-table";
import {
  ProductsDrawers,
  useProductsDrawers,
} from "./components/products-drawers";

const route = getRouteApi("/_authenticated/products");

function ProductsContent() {
  const { t } = useTranslation();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const queryClient = useQueryClient();
  const { openCreateDrawer, openEditDrawer } = useProductsDrawers();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("product.title")}
          </h2>
          <p className="text-muted-foreground">{t("product.description")}</p>
        </div>
        <ProductsPrimaryButtons onCreate={openCreateDrawer} />
      </div>
      <ProductsTable
        search={search}
        navigate={navigate}
        onEdit={openEditDrawer}
        onRefresh={handleRefresh}
      />
    </Main>
  );
}

export function Products() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <ProductsDrawers onRefresh={handleRefresh}>
      <ProductsContent />
    </ProductsDrawers>
  );
}
