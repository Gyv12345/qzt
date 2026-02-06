import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { ProductFormDialog } from "./product-form-dialog";
import type { Product } from "../types/product";

interface ProductsDialogsContextType {
  openCreateDialog: () => void;
  openEditDialog: (product: Product) => void;
  closeDialog: () => void;
}

const ProductsDialogsContext = createContext<
  ProductsDialogsContextType | undefined
>(undefined);

interface ProductsDialogsProviderProps {
  children: ReactNode;
  onRefresh: () => void;
}

export function ProductsDialogsProvider({
  children,
  onRefresh,
}: ProductsDialogsProviderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(
    undefined,
  );

  const openCreateDialog = useCallback(() => {
    setEditingProduct(undefined);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingProduct(undefined);
  }, []);

  return (
    <ProductsDialogsContext.Provider
      value={{ openCreateDialog, openEditDialog, closeDialog }}
    >
      {children}
      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSuccess={() => {
          onRefresh();
          closeDialog();
        }}
      />
    </ProductsDialogsContext.Provider>
  );
}

export function useProductsDialogs() {
  const context = useContext(ProductsDialogsContext);
  if (!context) {
    throw new Error(
      "useProductsDialogs must be used within ProductsDialogsProvider",
    );
  }
  return context;
}

export { ProductsDialogsProvider as ProductsDialogs };
