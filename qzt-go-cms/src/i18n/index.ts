import { en } from "./en";
import { zh } from "./zh";

/** 站点支持的 locale(与后端 GET /storefront/public/config 的 locales 对齐)。 */
export type Locale = "en" | "zh";

export const locales: Locale[] = ["en", "zh"];
export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as string[]).includes(value);
}

/** 字典类型以 en 为基准; zh 声明为 Dict, 两端字段不一致会直接编译报错。 */
export type Dict = typeof en;

/** 同步返回对应 locale 的字典对象(纯静态数据, 无异步加载)。 */
export function getDictionary(locale: Locale): Dict {
  return locale === "zh" ? zh : en;
}

export { en, zh };
