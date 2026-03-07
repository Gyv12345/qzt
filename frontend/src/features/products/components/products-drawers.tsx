import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { ProductFormDrawer } from "./product-form-drawer";
import type { Product } from "../types/product";

interface ProductsDrawersContextType {
  openCreateDrawer: () => void;
  openEditDrawer: (product: Product) => void;
  closeDrawer: () => void;
}

const ProductsDrawersContext = createContext<
  ProductsDrawersContextType | undefined
>(undefined);

interface ProductsDrawersProviderProps {
  children: ReactNode;
  onRefresh: () => void;
}

export function ProductsDrawersProvider({
  children,
  onRefresh,
}: ProductsDrawersProviderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(
    undefined,
  );

  const openCreateDrawer = useCallback(() => {
    setEditingProduct(undefined);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((product: Product) => {
    setEditingProduct(product);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingProduct(undefined);
  }, []);

  return (
    <ProductsDrawersContext.Provider
      value={{ openCreateDrawer, openEditDrawer, closeDrawer }}
    >
      {children}
      <ProductFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        product={editingProduct}
        onSuccess={() => {
          onRefresh();
          closeDrawer();
        }}
      />
    </ProductsDrawersContext.Provider>
  );
}

export function useProductsDrawers() {
  const context = useContext(ProductsDrawersContext);
  if (!context) {
    throw new Error(
      "useProductsDrawers must be used within ProductsDrawersProvider",
    );
  }
  return context;
}

export { ProductsDrawersProvider as ProductsDrawers };
