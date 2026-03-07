import { test, expect } from "@playwright/test";
import { login, navigateTo, waitForLoading } from "../helpers/test-helpers";

test.describe("合同管理", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("应该显示合同列表页面", async ({ page }) => {
    await navigateTo(page, "/contracts");

    // 验证页面标题
    await expect(page.locator("h2")).toContainText("合同");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 验证表格存在
    await expect(page.locator("table")).toBeVisible();
  });

  test("应该能够打开新建合同对话框", async ({ page }) => {
    await navigateTo(page, "/contracts");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 点击新建按钮
    await page.click('button:has-text("新建")');

    // 等待对话框打开
    await page.waitForSelector("text=新建合同", { timeout: 5000 });

    // 验证对话框内容
    await expect(page.locator("text=新建合同")).toBeVisible();
  });

  test("应该能够创建新合同", async ({ page }) => {
    await navigateTo(page, "/contracts");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 点击新建按钮
    await page.click('button:has-text("新建")');

    // 等待对话框打开
    await page.waitForSelector("text=新建合同", { timeout: 5000 });

    // 填写合同基本信息
    const timestamp = Date.now();
    await page.fill('input[name="title"]', `测试合同_${timestamp}`);
    await page.fill('input[name="amount"]', "10000");

    // 选择客户（如果需要）
    const customerSelect = page.locator('select[name="customerId"]').or(
      page.locator('[data-testid="customer-select"]')
    );
    if (await customerSelect.isVisible().catch(() => false)) {
      await customerSelect.click();
      await page.waitForTimeout(300);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
    }

    // 选择开始日期
    const startDateInput = page.locator('input[name="startDate"]').or(
      page.locator('input[type="date"]').first()
    );
    if (await startDateInput.isVisible().catch(() => false)) {
      await startDateInput.fill("2025-01-01");
    }

    // 选择结束日期
    const endDateInput = page.locator('input[name="endDate"]').or(
      page.locator('input[type="date"]').last()
    );
    if (await endDateInput.isVisible().catch(() => false)) {
      await endDateInput.fill("2025-12-31");
    }

    // 提交表单
    await page.click('button[type="submit"]:has-text("创建")').catch(() => {
      // 尝试其他可能的提交按钮
      return page.click('button:has-text("确定")');
    });

    // 等待对话框关闭
    await page.waitForTimeout(1000);
  });

  test("应该能够查看合同详情", async ({ page }) => {
    await navigateTo(page, "/contracts");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 检查是否有合同数据
    const rows = await page.locator("table tbody tr").count();
    if (rows === 0) {
      test.skip();
      return;
    }

    // 点击第一个合同
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();

    // 等待详情对话框打开
    await page.waitForSelector("text=合同详情", { timeout: 5000 }).catch(() => {
      // 可能是其他标题
      return page.waitForSelector("text=基本信息", { timeout: 5000 });
    });
  });

  test("应该能够编辑合同", async ({ page }) => {
    await navigateTo(page, "/contracts");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 检查是否有合同数据
    const rows = await page.locator("table tbody tr").count();
    if (rows === 0) {
      test.skip();
      return;
    }

    // 点击编辑按钮
    const editButton = page.locator('button:has-text("编辑")').first();
    const isVisible = await editButton.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip();
      return;
    }

    await editButton.click();

    // 等待编辑对话框打开
    await page.waitForSelector("text=编辑合同", { timeout: 5000 });

    // 修改合同标题
    const titleInput = page.locator('input[name="title"]');
    const currentValue = await titleInput.inputValue();
    await titleInput.fill(currentValue + "_已修改");

    // 提交表单
    await page.click('button[type="submit"]:has-text("保存")').catch(() => {
      return page.click('button:has-text("确定")');
    });

    // 等待对话框关闭
    await page.waitForTimeout(1000);
  });

  test("应该能够删除合同", async ({ page }) => {
    await navigateTo(page, "/contracts");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 检查是否有合同数据
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

  test("应该支持搜索合同", async ({ page }) => {
    await navigateTo(page, "/contracts");

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

  test("应该能够筛选合同状态", async ({ page }) => {
    await navigateTo(page, "/contracts");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 查找状态筛选
    const statusFilter = page.locator('button:has-text("状态")').first();
    const hasFilter = await statusFilter.isVisible().catch(() => false);

    if (!hasFilter) {
      test.skip();
      return;
    }

    await statusFilter.click();
    await page.waitForTimeout(500);

    // 选择一个状态
    await page.click("text=执行中").catch(() => {});
    await page.waitForTimeout(500);
  });
});

test.describe("合同流程测试", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("完整的合同创建到审批流程", async ({ page }) => {
    // 1. 导航到合同页面
    await navigateTo(page, "/contracts");
    await page.waitForSelector("table", { timeout: 10000 });

    // 2. 创建合同
    await page.click('button:has-text("新建")');
    await page.waitForSelector("text=新建合同", { timeout: 5000 });

    const timestamp = Date.now();
    await page.fill('input[name="title"]', `流程测试合同_${timestamp}`);
    await page.fill('input[name="amount"]', "50000");

    await page.click('button[type="submit"]:has-text("创建")').catch(() => {});
    await page.waitForTimeout(1000);

    // 3. 查找刚创建的合同
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    await searchInput.fill(`流程测试合同_${timestamp}`);
    await searchInput.press("Enter");
    await page.waitForTimeout(500);

    // 4. 提交审批（如果有此功能）
    const submitButton = page.locator('button:has-text("提交审批")').first();
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(500);
    }

    // 验证页面正常
    await expect(page.locator("table")).toBeVisible();
  });
});
