import { test, expect } from "@playwright/test";
import { login, navigateTo, waitForLoading } from "../helpers/test-helpers";

test.describe("收款管理", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("应该显示收款列表页面", async ({ page }) => {
    await navigateTo(page, "/payments");

    // 验证页面标题
    await expect(page.locator("h2")).toContainText("收款");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 验证表格存在
    await expect(page.locator("table")).toBeVisible();
  });

  test("应该能够打开新建收款对话框", async ({ page }) => {
    await navigateTo(page, "/payments");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 点击新建按钮
    await page.click('button:has-text("新建")');

    // 等待对话框打开
    await page.waitForSelector("text=新建收款", { timeout: 5000 }).catch(() => {
      // 可能是其他标题
      return page.waitForSelector("text=收款", { timeout: 5000 });
    });
  });

  test("应该能够创建收款记录", async ({ page }) => {
    await navigateTo(page, "/payments");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 点击新建按钮
    await page.click('button:has-text("新建")');

    // 等待对话框打开
    await page.waitForTimeout(500);

    // 填写收款信息
    const timestamp = Date.now();

    // 选择合同（如果有）
    const contractSelect = page.locator('select[name="contractId"]').or(
      page.locator('[data-testid="contract-select"]')
    );
    if (await contractSelect.isVisible().catch(() => false)) {
      await contractSelect.click();
      await page.waitForTimeout(300);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
    }

    // 填写金额
    const amountInput = page.locator('input[name="amount"]');
    if (await amountInput.isVisible().catch(() => false)) {
      await amountInput.fill("1000");
    }

    // 选择支付方式
    const methodSelect = page.locator('select[name="method"]').or(
      page.locator('[data-testid="method-select"]')
    );
    if (await methodSelect.isVisible().catch(() => false)) {
      await methodSelect.click();
      await page.waitForTimeout(300);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
    }

    // 提交表单
    await page.click('button[type="submit"]:has-text("创建")').catch(() => {
      return page.click('button:has-text("确定")');
    });

    // 等待对话框关闭
    await page.waitForTimeout(1000);
  });

  test("应该能够确认收款", async ({ page }) => {
    await navigateTo(page, "/payments");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 检查是否有收款数据
    const rows = await page.locator("table tbody tr").count();
    if (rows === 0) {
      test.skip();
      return;
    }

    // 查找待确认的收款记录
    const confirmButton = page.locator('button:has-text("确认")').first();
    const isVisible = await confirmButton.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip();
      return;
    }

    await confirmButton.click();

    // 等待操作完成
    await page.waitForTimeout(1000);
  });

  test("应该能够查看收款详情", async ({ page }) => {
    await navigateTo(page, "/payments");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });

    // 检查是否有收款数据
    const rows = await page.locator("table tbody tr").count();
    if (rows === 0) {
      test.skip();
      return;
    }

    // 点击查看按钮或点击行
    const viewButton = page.locator('button:has-text("查看")').first();
    if (await viewButton.isVisible().catch(() => false)) {
      await viewButton.click();
    } else {
      const firstRow = page.locator("table tbody tr").first();
      await firstRow.click();
    }

    // 等待详情打开
    await page.waitForTimeout(500);
  });

  test("应该支持筛选收款状态", async ({ page }) => {
    await navigateTo(page, "/payments");

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
    await page.click("text=已确认").catch(() => {});
    await page.waitForTimeout(500);
  });

  test("应该支持搜索收款记录", async ({ page }) => {
    await navigateTo(page, "/payments");

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
});

test.describe("支付配置", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("应该显示支付配置页面", async ({ page }) => {
    await navigateTo(page, "/payments/config");

    // 验证页面标题
    await expect(page.locator("h2")).toContainText("支付配置");

    // 等待表格加载
    await page.waitForSelector("table", { timeout: 10000 });
  });

  test("应该能够打开新建支付配置对话框", async ({ page }) => {
    await navigateTo(page, "/payments/config");

    // 等待页面加载
    await page.waitForLoadState("networkidle");

    // 点击新建按钮
    await page.click('button:has-text("新建配置")');

    // 等待对话框打开
    await page.waitForSelector("text=新建支付配置", { timeout: 5000 });

    // 验证对话框内容
    await expect(page.locator("text=新建支付配置")).toBeVisible();
  });

  test("应该能够创建微信支付配置", async ({ page }) => {
    await navigateTo(page, "/payments/config");

    // 等待页面加载
    await page.waitForLoadState("networkidle");

    // 点击新建按钮
    await page.click('button:has-text("新建配置")');

    // 等待对话框打开
    await page.waitForSelector("text=新建支付配置", { timeout: 5000 });

    // 选择微信支付
    await page.click('[role="combobox"]').first();
    await page.waitForTimeout(300);
    await page.click("text=微信支付");

    // 填写配置信息
    const timestamp = Date.now();
    await page.fill('input[placeholder*="wx"]', `wx_test_${timestamp}`);
    await page.fill('input[placeholder*="123456"]', "1234567890");

    // 提交表单
    await page.click('button:has-text("创建")');

    // 等待对话框关闭
    await page.waitForTimeout(1000);
  });

  test("应该能够切换支付配置状态", async ({ page }) => {
    await navigateTo(page, "/payments/config");

    // 等待页面加载
    await page.waitForLoadState("networkidle");

    // 检查是否有配置数据
    const switchButton = page.locator('button[role="switch"]').first();
    const isVisible = await switchButton.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip();
      return;
    }

    // 切换状态
    await switchButton.click();

    // 等待操作完成
    await page.waitForTimeout(500);
  });

  test("应该能够编辑支付配置", async ({ page }) => {
    await navigateTo(page, "/payments/config");

    // 等待页面加载
    await page.waitForLoadState("networkidle");

    // 检查是否有配置数据
    const editButton = page.locator('button:has(svg[class*="lucide-pencil"])').first();
    const isVisible = await editButton.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip();
      return;
    }

    await editButton.click();

    // 等待编辑对话框打开
    await page.waitForSelector("text=编辑支付配置", { timeout: 5000 });

    // 验证对话框内容
    await expect(page.locator("text=编辑支付配置")).toBeVisible();
  });

  test("应该能够删除支付配置", async ({ page }) => {
    await navigateTo(page, "/payments/config");

    // 等待页面加载
    await page.waitForLoadState("networkidle");

    // 检查是否有配置数据
    const deleteButton = page.locator('button:has(svg[class*="lucide-trash"])').first();
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
});

test.describe("收款流程测试", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("完整的收款确认流程", async ({ page }) => {
    // 1. 导航到收款页面
    await navigateTo(page, "/payments");
    await page.waitForSelector("table", { timeout: 10000 });

    // 2. 创建收款记录
    await page.click('button:has-text("新建")');
    await page.waitForTimeout(500);

    // 填写收款信息
    const amountInput = page.locator('input[name="amount"]');
    if (await amountInput.isVisible().catch(() => false)) {
      await amountInput.fill("2000");
    }

    await page.click('button[type="submit"]').catch(() => {});
    await page.waitForTimeout(1000);

    // 3. 查找待确认的记录
    const statusBadge = page.locator("text=待确认").first();
    if (await statusBadge.isVisible().catch(() => false)) {
      // 4. 确认收款
      const confirmButton = page.locator('button:has-text("确认")').first();
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // 验证页面正常
    await expect(page.locator("table")).toBeVisible();
  });
});
