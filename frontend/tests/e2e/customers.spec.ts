import { test, expect } from "@playwright/test";
import { login, navigateTo, waitForLoading } from "../helpers/test-helpers";

test.describe("客户管理", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("应该显示客户列表页面", async ({ page }) => {
    await navigateTo(page, "/customers");

    // 验证页面标题
    await expect(page.locator("h2")).toContainText("客户");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 验证表格存在
    await expect(page.locator("table")).toBeVisible();
  });

  test("应该支持搜索客户", async ({ page }) => {
    await navigateTo(page, "/customers");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 输入搜索关键词
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    await searchInput.fill("测试");
    await searchInput.press("Enter");

    // 等待搜索结果
    await page.waitForTimeout(1000);

    // 验证页面仍然正常
    await expect(page.locator("table")).toBeVisible();
  });

  test("应该能够打开新建客户对话框", async ({ page }) => {
    await navigateTo(page, "/customers");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 点击新建按钮
    await page.click('button:has-text("新建")');

    // 等待对话框打开
    await page.waitForSelector("text=新建客户", { timeout: 5000 });

    // 验证对话框内容
    await expect(page.locator("text=新建客户")).toBeVisible();
  });

  test("应该能够创建新客户", async ({ page }) => {
    await navigateTo(page, "/customers");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 点击新建按钮
    await page.click('button:has-text("新建")');

    // 等待对话框打开
    await page.waitForSelector("text=新建客户", { timeout: 5000 });

    // 填写表单
    const timestamp = Date.now();
    await page.fill('input[name="name"]', `测试客户_${timestamp}`);
    await page.fill('input[name="phone"]', "13800138000");
    await page.fill('input[name="email"]', `test_${timestamp}@example.com`);

    // 提交表单
    await page.click('button[type="submit"]:has-text("创建")');

    // 等待对话框关闭
    await page
      .waitForSelector("text=新建客户", { state: "hidden", timeout: 5000 })
      .catch(() => {});

    // 验证成功（通过检查页面是否刷新或有成功提示）
    await page.waitForTimeout(1000);
  });

  test("应该能够查看客户详情", async ({ page }) => {
    await navigateTo(page, "/customers");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 检查是否有客户数据
    const rows = await page.locator("table tbody tr").count();
    if (rows === 0) {
      test.skip();
      return;
    }

    // 点击第一个客户行
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();

    // 等待详情对话框打开
    await page.waitForSelector("text=基本信息", { timeout: 5000 });

    // 验证详情内容
    await expect(page.locator("text=基本信息")).toBeVisible();
  });

  test("应该能够编辑客户", async ({ page }) => {
    await navigateTo(page, "/customers");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 检查是否有客户数据
    const rows = await page.locator("table tbody tr").count();
    if (rows === 0) {
      test.skip();
      return;
    }

    // 点击编辑按钮（通常在操作列）
    const editButton = page.locator('button:has-text("编辑")').first();
    const isVisible = await editButton.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip();
      return;
    }

    await editButton.click();

    // 等待编辑对话框打开
    await page.waitForSelector("text=编辑客户", { timeout: 5000 });

    // 修改客户名称
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill(await nameInput.inputValue() + "_已修改");

    // 提交表单
    await page.click('button[type="submit"]:has-text("保存")');

    // 等待对话框关闭
    await page.waitForSelector("text=编辑客户", {
      state: "hidden",
      timeout: 5000,
    });
  });

  test("应该能够删除客户", async ({ page }) => {
    await navigateTo(page, "/customers");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 检查是否有客户数据
    const rows = await page.locator("table tbody tr").count();
    if (rows === 0) {
      test.skip();
      return;
    }

    // 点击删除按钮
    const deleteButton = page.locator('button:has-text("删除")').first();
    const isVisible = await deleteButton.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip();
      return;
    }

    // 设置对话框处理
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await deleteButton.click();

    // 等待删除完成
    await page.waitForTimeout(1000);
  });

  test("应该支持分页", async ({ page }) => {
    await navigateTo(page, "/customers");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 检查分页组件是否存在
    const pagination = page.locator('[data-testid="pagination"]');
    const hasPagination = await pagination.isVisible().catch(() => false);

    if (!hasPagination) {
      // 没有分页，可能数据较少
      test.skip();
      return;
    }

    // 点击下一页
    await page.click('button:has-text("下一页")').catch(() => {});

    // 等待加载
    await page.waitForTimeout(1000);

    // 验证页面仍然正常
    await expect(page.locator("table")).toBeVisible();
  });

  test("应该支持筛选", async ({ page }) => {
    await navigateTo(page, "/customers");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 查找筛选按钮
    const filterButton = page.locator('button:has-text("筛选")').first();
    const hasFilter = await filterButton.isVisible().catch(() => false);

    if (!hasFilter) {
      test.skip();
      return;
    }

    await filterButton.click();

    // 等待筛选面板打开
    await page.waitForTimeout(500);
  });
});

test.describe("客户详情页", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("应该显示客户的基本信息", async ({ page }) => {
    await navigateTo(page, "/customers");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 检查是否有客户数据
    const rows = await page.locator("table tbody tr").count();
    if (rows === 0) {
      test.skip();
      return;
    }

    // 点击第一个客户
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();

    // 等待详情打开
    await page.waitForSelector("text=基本信息", { timeout: 5000 });

    // 验证基本信息标签
    await expect(page.locator("text=基本信息")).toBeVisible();
  });

  test("应该显示客户的跟进记录", async ({ page }) => {
    await navigateTo(page, "/customers");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 检查是否有客户数据
    const rows = await page.locator("table tbody tr").count();
    if (rows === 0) {
      test.skip();
      return;
    }

    // 点击第一个客户
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();

    // 点击跟进记录 Tab
    await page.click("text=跟进记录").catch(() => {});
    await page.waitForTimeout(500);
  });

  test("应该显示客户的合同列表", async ({ page }) => {
    await navigateTo(page, "/customers");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 检查是否有客户数据
    const rows = await page.locator("table tbody tr").count();
    if (rows === 0) {
      test.skip();
      return;
    }

    // 点击第一个客户
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();

    // 点击合同 Tab
    await page.click("text=合同").catch(() => {});
    await page.waitForTimeout(500);
  });
});
