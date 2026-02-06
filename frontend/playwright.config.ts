import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright 测试配置
 */
export default defineConfig({
  testDir: "./tests/e2e",
  /* 并行运行测试 */
  fullyParallel: true,
  /* 在 CI 环境中失败时不重试 */
  forbidOnly: !!process.env.CI,
  /* 在 CI 环境中重试失败 */
  retries: process.env.CI ? 2 : 0,
  /* 在 CI 中并行执行 */
  workers: process.env.CI ? 1 : undefined,
  /* 测试报告 */
  reporter: [
    ["html"],
    ["list"],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],
  /* 共享设置 */
  use: {
    /* 基础 URL */
    baseURL: "http://localhost:3456",
    /* 追踪选项 (失败时重试) */
    trace: "on-first-retry",
    /* 截图选项 (仅失败时) */
    screenshot: "only-on-failure",
  },

  /* 测试项目配置 */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    /* 测试移动视口 */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  /* 本地开发时运行测试服务器 */
  webServer: {
    command: "pnpm run dev",
    url: "http://localhost:3456",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
