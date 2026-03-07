/**
 * Drawer 抽屉组件
 *
 * 侧边栏抽屉组件，基于 Sheet 组件实现。
 * 这是对 Sheet 的别名导出，提供更符合 drawer 语义的组件命名。
 *
 * 使用方式与 Sheet 完全相同，但更适合表示从侧边滑出的抽屉：
 * - DrawerContent 相当于 SheetContent (side="left" | "right")
 * - DrawerHeader 相当于 SheetHeader
 * - DrawerTitle 相当于 SheetTitle
 *
 * @example
 * ```tsx
 * import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
 *
 * <Drawer open={open} onOpenChange={setOpen}>
 *   <DrawerContent>
 *     <DrawerHeader>
 *       <DrawerTitle>标题</DrawerTitle>
 *     </DrawerHeader>
 *     <div>内容</div>
 *   </DrawerContent>
 * </Drawer>
 * ```
 */

// 从 Sheet 组件重新导出所有内容，使用 Drawer 命名
export {
  Sheet as Drawer,
  SheetTrigger as DrawerTrigger,
  SheetClose as DrawerClose,
  SheetContent as DrawerContent,
  SheetHeader as DrawerHeader,
  SheetFooter as DrawerFooter,
  SheetTitle as DrawerTitle,
  SheetDescription as DrawerDescription,
} from "./sheet";
