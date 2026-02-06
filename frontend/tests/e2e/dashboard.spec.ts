import { test, expect } from "@playwright/test";
import { login, navigateTo, waitForLoading } from "../helpers/test-helpers";

test.describe("仪表盘", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("应该显示仪表盘页面", async ({ page }) => {
    await expect(page).toHaveTitle(/Shadcn Admin/);
    await expect(page.locator("h1")).toContainText("工作台");
  });

  test("应该显示统计卡片", async ({ page }) => {
    // 等待统计数据加载
    await page.waitForSelector("text=总收入", { timeout: 10000 });
    await page.waitForSelector("text=客户数", { timeout: 10000 });
    await page.waitForSelector("text=订单数", { timeout: 10000 });

    // 验证卡片存在
    await expect(page.locator("text=总收入")).toBeVisible();
    await expect(page.locator("text=客户数")).toBeVisible();
    await expect(page.locator("text=订单数")).toBeVisible();
  });

  test("应该支持刷新数据", async ({ page }) => {
    // 等待页面加载完成
    await page.waitForSelector("text=总收入");

    // 点击刷新按钮
    await page.click('button:has-text("刷新")');

    // 等待刷新动画完成
    await page.waitForTimeout(1000);

    // 验证页面仍然显示统计卡片
    await expect(page.locator("text=总收入")).toBeVisible();
  });

  test("应该显示客户增长趋势图表", async ({ page }) => {
    // 等待图表加载
    await page.waitForSelector("text=客户增长趋势", { timeout: 10000 });

    // 验证图表标题
    await expect(page.locator("text=客户增长趋势")).toBeVisible();
  });

  test("应该显示数据概览", async ({ page }) => {
    // 等待数据概览加载
    await page.waitForSelector("text=数据概览", { timeout: 10000 });

    // 验证标题
    await expect(page.locator("text=数据概览")).toBeVisible();
  });
});

test.describe("仪表盘 - 未登录用户", () => {
  test("应该重定向到登录页面", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("/login", { timeout: 5000 });
    await expect(page).toHaveURL("/login");
  });
});
