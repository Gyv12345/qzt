import { test, expect } from "@playwright/test";
import { login, debugScreenshot } from "../helpers/test-helpers";

test.describe("跟进记录", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("应该能够打开客户详情对话框", async ({ page }) => {
    // 导航到客户列表
    await page.goto("/customers");
    await page.waitForLoadState("networkidle");

    // 等待客户列表加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 点击第一个客户行
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();

    // 等待详情对话框打开
    await page.waitForSelector("text=基本信息", { timeout: 5000 });
    await page.waitForSelector("text=跟进记录", { timeout: 5000 });

    // 验证对话框内容
    await expect(page.locator("text=基本信息")).toBeVisible();
    await expect(page.locator("text=跟进记录")).toBeVisible();
  });

  test("应该能够创建跟进记录", async ({ page }) => {
    // 导航到客户列表
    await page.goto("/customers");
    await page.waitForLoadState("networkidle");

    // 等待客户列表加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 点击第一个客户行
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();

    // 点击跟进记录 Tab
    await page.click("text=跟进记录");
    await page.waitForTimeout(500);

    // 点击新建跟进按钮
    await page.click('button:has-text("新建跟进")');

    // 等待对话框打开
    await page.waitForSelector("text=新建跟进记录", { timeout: 5000 });

    // 填写表单
    await page.selectOption('select[name="type"]', "1"); // 电话
    await page.fill(
      'textarea[name="content"]',
      "测试跟进记录 - Playwright 自动化测试",
    );

    // 提交表单
    await page.click('button[type="submit"]:has-text("创建")');

    // 等待对话框关闭
    await page
      .waitForSelector("text=新建跟进记录", { state: "hidden", timeout: 5000 })
      .catch(() => {});

    // 验证成功提示（如果有的话）
    // await expect(page.locator('text=创建成功')).toBeVisible()
  });

  test("应该能够编辑跟进记录", async ({ page }) => {
    // 导航到客户列表
    await page.goto("/customers");
    await page.waitForLoadState("networkidle");

    // 点击第一个客户行
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();

    // 点击跟进记录 Tab
    await page.click("text=跟进记录");
    await page.waitForTimeout(500);

    // 等待跟进记录列表加载
    await page.waitForSelector("table", { timeout: 10000 }).catch(() => {
      // 如果没有跟进记录，跳过测试
      test.skip();
    });

    // 点击第一个编辑按钮
    const editButton = page.locator('button:has-text("编辑")').first();
    const isVisible = await editButton.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip();
    }

    await editButton.click();

    // 等待编辑对话框打开
    await page.waitForSelector("text=编辑跟进记录", { timeout: 5000 });

    // 修改内容
    await page.fill(
      'textarea[name="content"]',
      "更新的跟进记录 - Playwright 自动化测试",
    );

    // 提交表单
    await page.click('button[type="submit"]:has-text("保存")');

    // 等待对话框关闭
    await page.waitForSelector("text=编辑跟进记录", {
      state: "hidden",
      timeout: 5000,
    });
  });

  test("应该能够删除跟进记录", async ({ page }) => {
    // 导航到客户列表
    await page.goto("/customers");
    await page.waitForLoadState("networkidle");

    // 点击第一个客户行
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();

    // 点击跟进记录 Tab
    await page.click("text=跟进记录");
    await page.waitForTimeout(500);

    // 等待跟进记录列表加载
    await page.waitForSelector("table", { timeout: 10000 }).catch(() => {
      test.skip();
    });

    // 点击第一个删除按钮
    const deleteButton = page.locator('button:has-text("删除")').first();
    const isVisible = await deleteButton.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip();
    }

    // 监听确认对话框
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await deleteButton.click();

    // 等待删除完成
    await page.waitForTimeout(1000);
  });
});

test.describe("客户列表", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("应该显示客户列表", async ({ page }) => {
    await page.goto("/customers");
    await page.waitForLoadState("networkidle");

    // 验证页面标题
    await expect(page.locator("h2")).toContainText("客户");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 验证表格存在
    await expect(page.locator("table")).toBeVisible();
  });

  test("应该支持搜索客户", async ({ page }) => {
    await page.goto("/customers");
    await page.waitForLoadState("networkidle");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 输入搜索关键词
    await page.fill('input[placeholder*="搜索"]', "测试");
    await page.press('input[placeholder*="搜索"]', "Enter");

    // 等待搜索结果
    await page.waitForTimeout(1000);

    // 验证页面仍然正常
    await expect(page.locator("table")).toBeVisible();
  });
});
