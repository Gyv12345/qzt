/**
 * 日期工具类
 */
export class DateUtil {
  /**
   * 格式化日期
   * @param date 日期对象或字符串
   * @param format 格式化模板 (默认: 'YYYY-MM-DD HH:mm:ss')
   * @returns 格式化后的日期字符串
   */
  static format(
    date: Date | string,
    format: string = "YYYY-MM-DD HH:mm:ss",
  ): string {
    const d = typeof date === "string" ? new Date(date) : date;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");

    return format
      .replace("YYYY", String(year))
      .replace("MM", month)
      .replace("DD", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace("ss", seconds);
  }

  /**
   * 解析日期字符串
   * @param dateStr 日期字符串
   * @returns Date 对象
   */
  static parse(dateStr: string): Date {
    return new Date(dateStr);
  }

  /**
   * 获取当前时间戳（秒）
   */
  static now(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * 获取当前时间戳（毫秒）
   */
  static nowMs(): number {
    return Date.now();
  }

  /**
   * 日期加减
   * @param date 日期对象
   * @param days 天数（正数加，负数减）
   * @returns 新的日期对象
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * 月份加减
   * @param date 日期对象
   * @param months 月数（正数加，负数减）
   * @returns 新的日期对象
   */
  static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * 小时加减
   * @param date 日期对象
   * @param hours 小时数（正数加，负数减）
   * @returns 新的日期对象
   */
  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  /**
   * 分钟加减
   * @param date 日期对象
   * @param minutes 分钟数（正数加，负数减）
   * @returns 新的日期对象
   */
  static addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  /**
   * 计算两个日期之间的天数差
   * @param date1 日期1
   * @param date2 日期2
   * @returns 天数差（绝对值）
   */
  static daysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.abs(Math.floor((date1.getTime() - date2.getTime()) / oneDay));
  }

  /**
   * 判断日期是否过期
   * @param date 待判断的日期
   * @returns 是否过期
   */
  static isExpired(date: Date): boolean {
    return new Date() > date;
  }

  /**
   * 判断日期是否在今天
   * @param date 待判断的日期
   * @returns 是否在今天
   */
  static isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  /**
   * 获取日期的开始时间（00:00:00）
   * @param date 日期对象
   * @returns 新的日期对象
   */
  static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * 获取日期的结束时间（23:59:59）
   * @param date 日期对象
   * @returns 新的日期对象
   */
  static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * 获取月份的开始时间
   * @param date 日期对象
   * @returns 新的日期对象
   */
  static startOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * 获取月份的结束时间
   * @param date 日期对象
   * @returns 新的日期对象
   */
  static endOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + 1);
    result.setDate(0);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * 将日期转换为 Cron 表达式
   * @param date 日期对象
   * @returns Cron 表达式 (秒 分 时 日 月 周)
   */
  static toCron(date: Date): string {
    const seconds = date.getSeconds();
    const minutes = date.getMinutes();
    const hours = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return `${seconds} ${minutes} ${hours} ${day} ${month} ? ${year}`;
  }

  /**
   * 获取时间戳对应的日期
   * @param timestamp 时间戳（毫秒）
   * @returns Date 对象
   */
  static fromTimestamp(timestamp: number): Date {
    return new Date(timestamp);
  }

  /**
   * 获取ISO格式的日期字符串
   * @param date 日期对象
   * @returns ISO 格式字符串
   */
  static toISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * 获取UTC时间
   * @param date 日期对象
   * @returns UTC 时间
   */
  static toUTC(date: Date): Date {
    return new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
      ),
    );
  }
}
