import { test, expect } from "@playwright/test";
import { login, logout, navigateTo } from "../helpers/test-helpers";

test.describe("登录流程", () => {
  test("应该显示登录页面", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // 验证登录表单存在
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("应该成功登录", async ({ page }) => {
    await login(page);

    // 验证登录成功后跳转到首页
    await expect(page).toHaveURL("/");
    await expect(page.locator("h1")).toContainText("工作台");
  });

  test("应该拒绝无效凭据", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // 填写错误的凭据
    await page.fill('input[name="username"]', "invalid");
    await page.fill('input[name="password"]', "wrongpassword");

    // 提交表单
    await page.click('button[type="submit"]');

    // 等待错误提示
    await page.waitForTimeout(1000);

    // 验证仍在登录页面
    await expect(page).toHaveURL(/login/);
  });

  test("应该成功登出", async ({ page }) => {
    await login(page);

    // 点击用户菜单
    await page.click('[data-testid="profile-dropdown"]');

    // 点击登出
    await page.click("text=登出");

    // 等待跳转到登录页面
    await page.waitForURL("/login", { timeout: 5000 });
    await expect(page).toHaveURL("/login");
  });

  test("未登录用户应该被重定向到登录页面", async ({ page }) => {
    await page.goto("/customers");
    await page.waitForURL("/login", { timeout: 5000 });
    await expect(page).toHaveURL("/login");
  });
});

test.describe("登录表单验证", () => {
  test("用户名为空时应该显示错误", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // 只填写密码
    await page.fill('input[name="password"]', "admin123");

    // 提交表单
    await page.click('button[type="submit"]');

    // 验证表单验证提示
    await page.waitForTimeout(500);
    // 表单应该阻止提交，仍在登录页
    await expect(page).toHaveURL("/login");
  });

  test("密码为空时应该显示错误", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // 只填写用户名
    await page.fill('input[name="username"]', "admin");

    // 提交表单
    await page.click('button[type="submit"]');

    // 验证表单验证提示
    await page.waitForTimeout(500);
    // 表单应该阻止提交，仍在登录页
    await expect(page).toHaveURL("/login");
  });
});
