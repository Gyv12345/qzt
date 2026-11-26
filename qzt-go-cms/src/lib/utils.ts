import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui 标配类名合并工具: 条件类名 + 冲突类去重(后者覆盖前者)。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
