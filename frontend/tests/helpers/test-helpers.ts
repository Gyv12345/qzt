import { Page, expect } from "@playwright/test";

/**
 * 测试辅助函数
 */

// 测试用户凭据
export const TEST_CREDENTIALS = {
  username: "admin",
  password: "admin123",
};

/**
 * 登录到系统
 */
export async function login(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // 填写登录表单
  await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
  await page.fill('input[name="password"]', TEST_CREDENTIALS.password);

  // 提交表单
  await page.click('button[type="submit"]');

  // 等待导航到仪表盘
  await page.waitForURL("/", { timeout: 10000 });
  await expect(page).toHaveURL("/");
}

/**
 * 登出系统
 */
export async function logout(page: Page) {
  await page.click('[data-testid="profile-dropdown"]');
  await page.click("text=登出");
  await page.waitForURL("/login");
}

/**
 * 导航到指定页面
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/**
 * 等待加载状态结束
 */
export async function waitForLoading(page: Page) {
  await page
    .waitForSelector('[data-testid="loading"]', {
      state: "hidden",
      timeout: 5000,
    })
    .catch(() => {});
}

/**
 * 填写表单
 */
export async function fillForm(page: Page, data: Record<string, string>) {
  for (const [key, value] of Object.entries(data)) {
    await page.fill(`[name="${key}"]`, value);
  }
}

/**
 * 截图并保存（用于调试）
 */
export async function debugScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: true,
  });
}

/**
 * 等待 API 响应
 */
export async function waitForApiResponse(page: Page, urlPattern: string) {
  return await page.waitForResponse(
    (response) =>
      response.url().includes(urlPattern) && response.status() === 200,
  );
}
