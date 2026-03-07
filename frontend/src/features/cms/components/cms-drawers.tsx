import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { CmsContent, ContentType } from "../types/cms";
import { CmsContentFormDrawer } from "./cms-content-form-drawer";

interface CmsDrawersContextValue {
  openCreateDrawer: (contentType?: ContentType) => void;
  openEditDrawer: (content: CmsContent) => void;
  closeDrawer: () => void;
  isDrawerOpen: boolean;
}

const CmsDrawersContext = createContext<CmsDrawersContextValue | undefined>(
  undefined,
);

interface CmsDrawersProviderProps {
  children: ReactNode;
  onRefresh: () => void;
}

export function CmsDrawersProvider({
  children,
  onRefresh,
}: CmsDrawersProviderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<
    CmsContent | undefined
  >();
  const [defaultContentType, setDefaultContentType] =
    useState<ContentType>("ARTICLE");

  const openCreateDrawer = useCallback((contentType?: ContentType) => {
    setEditingContent(undefined);
    setDefaultContentType(contentType || "ARTICLE");
    setIsDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((content: CmsContent) => {
    setEditingContent(content);
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setEditingContent(undefined);
  }, []);

  const handleSuccess = useCallback(() => {
    closeDrawer();
    onRefresh();
  }, [closeDrawer, onRefresh]);

  return (
    <CmsDrawersContext.Provider
      value={{
        openCreateDrawer,
        openEditDrawer,
        closeDrawer,
        isDrawerOpen,
      }}
    >
      {children}
      <CmsContentFormDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        content={editingContent}
        defaultContentType={defaultContentType}
        onSuccess={handleSuccess}
      />
    </CmsDrawersContext.Provider>
  );
}

export function useCmsDrawers() {
  const context = useContext(CmsDrawersContext);
  if (!context) {
    throw new Error("useCmsDrawers must be used within CmsDrawersProvider");
  }
  return context;
}

// 便捷导出
export { CmsDrawersProvider as CmsDrawers };
