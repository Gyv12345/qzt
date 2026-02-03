#!/usr/bin/env python3
"""
企账通前端 UI 测试脚本
使用 Playwright 测试前端界面功能
"""

from playwright.sync_api import sync_playwright
import time
import sys
from pathlib import Path


class QZTUITest:
    """企账通前端 UI 测试框架"""

    def __init__(self, base_url: str = "http://localhost:3456"):
        self.base_url = base_url
        self.passed = 0
        self.failed = 0

    def log(self, message: str, status: str = "INFO"):
        """记录测试日志"""
        icons = {
            "PASS": "✅",
            "FAIL": "❌",
            "INFO": "ℹ️",
            "WARN": "⚠️",
            "START": "🚀"
        }
        icon = icons.get(status, "•")
        print(f"{icon} {message}")

        if status == "PASS":
            self.passed += 1
        elif status == "FAIL":
            self.failed += 1

    def test_login(self, page) -> bool:
        """测试登录功能"""
        self.log("测试: 用户登录", "START")

        try:
            # 访问登录页面
            page.goto(self.base_url)
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            # 填写登录表单
            page.locator('input[placeholder="用户名"]').fill('admin')
            page.locator('input[placeholder="密码"]').fill('admin123')

            # 点击登录按钮
            page.locator('button[type="submit"]').click()

            # 等待登录成功
            page.wait_for_timeout(2000)

            # 验证是否跳转到首页
            current_url = page.url
            if '/login' not in current_url:
                self.log("登录成功，已跳转到首页", "PASS")
                return True
            else:
                self.log("登录失败，仍在登录页", "FAIL")
                return False

        except Exception as e:
            self.log(f"登录测试异常: {str(e)}", "FAIL")
            return False

    def test_customer_page(self, page) -> bool:
        """测试客户管理页面"""
        self.log("测试: 客户管理页面", "START")

        try:
            # 导航到客户管理
            page.click('text=客户管理')
            page.wait_for_load_state('networkidle')
            time.sleep(1)

            # 检查页面标题
            title = page.title()
            if '客户' in title or 'Customer' in title:
                self.log("成功访问客户管理页面", "PASS")
                return True
            else:
                self.log("客户管理页面标题异常", "FAIL")
                return False

        except Exception as e:
            self.log(f"客户管理页面测试异常: {str(e)}", "FAIL")
            return False

    def test_follow_record_page(self, page) -> bool:
        """测试跟进记录页面"""
        self.log("测试: 跟进记录页面", "START")

        try:
            page.click('text=跟进记录')
            page.wait_for_load_state('networkidle')
            time.sleep(1)

            self.log("成功访问跟进记录页面", "PASS")
            return True

        except Exception as e:
            self.log(f"跟进记录页面测试异常: {str(e)}", "FAIL")
            return False

    def test_contract_page(self, page) -> bool:
        """测试合同管理页面"""
        self.log("测试: 合同管理页面", "START")

        try:
            page.click('text=合同管理')
            page.wait_for_load_state('networkidle')
            time.sleep(1)

            self.log("成功访问合同管理页面", "PASS")
            return True

        except Exception as e:
            self.log(f"合同管理页面测试异常: {str(e)}", "FAIL")
            return False

    def run_all_tests(self):
        """运行所有 UI 测试"""
        print("\n" + "="*60)
        print("企账通前端 UI 测试套件")
        print("="*60 + "\n")

        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome", headless=True)
            page = browser.new_page()

            try:
                # 1. 登录测试
                if not self.test_login(page):
                    self.log("登录失败，终止测试", "FAIL")
                    browser.close()
                    return

                # 2. 测试各主要页面
                self.test_customer_page(page)
                self.test_follow_record_page(page)
                self.test_contract_page(page)

                # 3. 截图保存
                screenshot_path = '/tmp/qzt_ui_test.png'
                page.screenshot(path=screenshot_path, full_page=True)
                self.log(f"已保存测试截图: {screenshot_path}", "INFO")

            finally:
                browser.close()

        self.print_summary()

    def print_summary(self):
        """打印测试摘要"""
        print("\n" + "="*60)
        print("UI 测试摘要")
        print("="*60)
        print(f"总计: {self.passed + self.failed} 个测试")
        print(f"✅ 通过: {self.passed}")
        print(f"❌ 失败: {self.failed}")
        if self.passed + self.failed > 0:
            print(f"通过率: {self.passed / (self.passed + self.failed) * 100:.1f}%")
        print("="*60 + "\n")


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="企账通前端 UI 测试")
    parser.add_argument(
        "--url",
        default="http://localhost:3456",
        help="前端服务 URL"
    )

    args = parser.parse_args()

    tester = QZTUITest(base_url=args.url)
    tester.run_all_tests()

    sys.exit(0 if tester.failed == 0 else 1)


if __name__ == "__main__":
    main()
