from playwright.sync_api import sync_playwright
import time
import sys

def test_login(port=7890):
    """测试登录页面功能"""
    print(f"🚀 开始测试，目标端口: {port}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        try:
            # 访问登录页面
            print(f"📍 正在访问登录页面 http://localhost:{port}...")
            page.goto(f'http://localhost:{port}')
            page.wait_for_load_state('networkidle')
            time.sleep(2)  # 等待页面完全渲染

            # 截图初始状态
            page.screenshot(path='/tmp/login_initial.png', full_page=True)
            print("✓ 已保存初始页面截图")

            # 检查页面标题
            title = page.title()
            print(f"📄 页面标题: {title}")

            # 检查登录卡片是否存在
            card_title = page.locator('.ant-card-head-title').text_content()
            print(f"🎴 卡片标题: {card_title}")

            # 填写登录表单
            print("📝 正在填写登录表单...")

            # 输入用户名
            page.locator('input[placeholder="用户名"]').fill('admin')
            print("  ✓ 已输入用户名: admin")

            # 输入密码
            page.locator('input[placeholder="密码"]').fill('admin123')
            print("  ✓ 已输入密码: ******")

            # 截图填写后的状态
            page.screenshot(path='/tmp/login_filled.png', full_page=True)

            # 点击登录按钮
            print("🔘 正在点击登录按钮...")
            page.locator('button[type="submit"]').click()

            # 等待响应
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            # 截图登录后的状态
            page.screenshot(path='/tmp/login_after.png', full_page=True)

            # 检查是否登录成功（通过 URL 变化或页面元素）
            current_url = page.url
            print(f"🔗 当前 URL: {current_url}")

            if 'dashboard' in current_url:
                print("✅ 登录成功！已跳转到 Dashboard")
            else:
                # 检查是否有错误消息
                error_message = page.locator('.ant-message-error').text_content()
                if error_message:
                    print(f"❌ 登录失败: {error_message}")
                else:
                    print("⚠️  登录状态未知")

            # 检查控制台日志
            print("\n📋 浏览器控制台日志:")
            # TODO: 添加 console log 收集

        except Exception as e:
            print(f"❌ 测试过程中出错: {str(e)}")
            page.screenshot(path='/tmp/error_screenshot.png', full_page=True)
            print("已保存错误截图")

        finally:
            browser.close()
            print("\n✓ 测试完成")

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 7890
    test_login(port)
