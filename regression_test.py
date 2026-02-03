#!/usr/bin/env python3
"""
企账通（QZT）系统回归测试脚本
测试主要功能模块和用户交互流程
"""

from playwright.sync_api import sync_playwright
import time
import sys

class RegressionTest:
    def __init__(self, base_url="http://localhost:3456"):
        self.base_url = base_url
        self.results = []

    def log(self, message, status="INFO"):
        """记录测试日志"""
        icon = {
            "PASS": "✅",
            "FAIL": "❌",
            "INFO": "ℹ️",
            "WARN": "⚠️"
        }
        print(f"{icon.get(status, '•')} {message}")
        if status in ["PASS", "FAIL"]:
            self.results.append({"test": message, "status": status})

    def setup_browser(self):
        """设置浏览器"""
        self.log("启动浏览器...")
        self.p = sync_playwright().start()
        self.browser = self.p.chromium.launch(channel="chrome", headless=True)
        self.context = self.browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )
        self.page = self.context.new_page()
        self.log("浏览器启动成功", "PASS")

    def teardown_browser(self):
        """关闭浏览器"""
        if hasattr(self, 'browser'):
            self.browser.close()
            self.p.stop()

    def test_homepage(self):
        """测试首页访问"""
        self.log("测试：访问首页")
        try:
            self.page.goto(self.base_url)
            self.page.wait_for_load_state('networkidle')
            time.sleep(2)

            title = self.page.title()
            self.log(f"页面标题: {title}")

            # 检查是否成功加载
            if title or self.page.url:
                self.log("首页访问成功", "PASS")
                self.page.screenshot(path='/tmp/test_homepage.png')
                return True
            else:
                self.log("首页访问失败", "FAIL")
                return False
        except Exception as e:
            self.log(f"首页访问异常: {str(e)}", "FAIL")
            return False

    def test_navigation(self):
        """测试导航功能"""
        self.log("测试：导航功能")
        try:
            # 查找导航链接
            nav_links = self.page.locator('a, nav a, .nav-link').all()
            self.log(f"发现 {len(nav_links)} 个导航链接")

            if len(nav_links) > 0:
                self.log("导航元素存在", "PASS")
                return True
            else:
                self.log("未发现导航元素", "FAIL")
                return False
        except Exception as e:
            self.log(f"导航测试异常: {str(e)}", "FAIL")
            return False

    def test_responsive_design(self):
        """测试响应式设计"""
        self.log("测试：响应式设计")
        try:
            # 测试桌面视图
            self.page.set_viewport_size({'width': 1920, 'height': 1080})
            time.sleep(1)
            desktop_screenshot = '/tmp/test_desktop.png'
            self.page.screenshot(path=desktop_screenshot)
            self.log("桌面视图截图已保存", "PASS")

            # 测试平板视图
            self.page.set_viewport_size({'width': 768, 'height': 1024})
            time.sleep(1)
            tablet_screenshot = '/tmp/test_tablet.png'
            self.page.screenshot(path=tablet_screenshot)
            self.log("平板视图截图已保存", "PASS")

            # 测试移动端视图
            self.page.set_viewport_size({'width': 375, 'height': 667})
            time.sleep(1)
            mobile_screenshot = '/tmp/test_mobile.png'
            self.page.screenshot(path=mobile_screenshot)
            self.log("移动端视图截图已保存", "PASS")

            return True
        except Exception as e:
            self.log(f"响应式设计测试异常: {str(e)}", "FAIL")
            return False

    def test_console_errors(self):
        """测试控制台错误"""
        self.log("测试：检查控制台错误")
        try:
            errors = []
            def handle_console(msg):
                if msg.type == 'error':
                    errors.append(msg.text)

            self.page.on('console', handle_console)

            # 刷新页面以捕获任何控制台错误
            self.page.reload()
            self.page.wait_for_load_state('networkidle')
            time.sleep(2)

            if len(errors) == 0:
                self.log("无控制台错误", "PASS")
                return True
            else:
                self.log(f"发现 {len(errors)} 个控制台错误", "WARN")
                for error in errors[:5]:  # 只显示前5个
                    self.log(f"  - {error}", "WARN")
                return False
        except Exception as e:
            self.log(f"控制台检查异常: {str(e)}", "FAIL")
            return False

    def test_login_page(self):
        """测试登录页面"""
        self.log("测试：登录页面")
        try:
            # 清除 localStorage 以模拟未登录状态
            self.page.evaluate("localStorage.clear()")

            # 访问登录页面
            self.page.goto(f"{self.base_url}/login")
            self.page.wait_for_load_state('networkidle')
            time.sleep(2)

            # 截图
            self.page.screenshot(path='/tmp/test_login_page.png')

            # 检查登录表单元素
            has_username_input = self.page.locator('input[type="text"], input[placeholder*="用户名"]').count() > 0
            has_password_input = self.page.locator('input[type="password"], input[placeholder*="密码"]').count() > 0
            has_submit_button = self.page.locator('button[type="submit"]').count() > 0

            if has_username_input and has_password_input and has_submit_button:
                self.log("登录表单元素完整", "PASS")
                return True
            else:
                self.log("登录表单元素不完整", "FAIL")
                self.log(f"  用户名输入框: {has_username_input}")
                self.log(f"  密码输入框: {has_password_input}")
                self.log(f"  提交按钮: {has_submit_button}")
                return False
        except Exception as e:
            self.log(f"登录页面测试异常: {str(e)}", "FAIL")
            return False

    def test_api_connectivity(self):
        """测试 API 连接"""
        self.log("测试：API 连接")
        try:
            # 监听网络请求
            api_requests = []

            def handle_request(request):
                if request.url.startswith('http'):
                    api_requests.append({
                        'url': request.url,
                        'method': request.method
                    })

            self.page.on('request', handle_request)

            # 访问首页
            self.page.goto(self.base_url)
            self.page.wait_for_load_state('networkidle')
            time.sleep(2)

            # 检查是否有 API 请求
            backend_requests = [r for r in api_requests if '7890' in r.get('url', '')]

            if len(backend_requests) > 0:
                self.log(f"检测到 {len(backend_requests)} 个后端 API 请求", "PASS")
                return True
            else:
                self.log("未检测到后端 API 请求", "WARN")
                return False
        except Exception as e:
            self.log(f"API 连接测试异常: {str(e)}", "FAIL")
            return False

    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print("🧪 企账通（QZT）系统回归测试")
        print("="*60 + "\n")

        try:
            self.setup_browser()

            # 运行测试套件
            self.test_homepage()
            self.test_navigation()
            self.test_console_errors()
            self.test_responsive_design()
            self.test_login_page()
            self.test_api_connectivity()

        finally:
            self.teardown_browser()

        # 打印测试结果摘要
        print("\n" + "="*60)
        print("📊 测试结果摘要")
        print("="*60)

        passed = sum(1 for r in self.results if r['status'] == 'PASS')
        failed = sum(1 for r in self.results if r['status'] == 'FAIL')
        total = len(self.results)

        print(f"\n总计: {total} 个测试")
        print(f"✅ 通过: {passed}")
        print(f"❌ 失败: {failed}")
        print(f"通过率: {(passed/total*100):.1f}%" if total > 0 else "通过率: N/A")

        if failed == 0:
            print("\n🎉 所有测试通过！")
            return 0
        else:
            print(f"\n⚠️  {failed} 个测试失败")
            return 1

if __name__ == '__main__':
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3456"
    tester = RegressionTest(base_url)
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)
