#!/usr/bin/env python3
"""
企账通（QZT）后端 API 测试脚本
测试各个 API 端点的可用性和响应
"""

import requests
import json
from typing import Dict, List, Tuple

class APITest:
    def __init__(self, base_url="http://localhost:7890"):
        self.base_url = base_url
        self.results = []
        self.token = None

    def log(self, message: str, status: str = "INFO"):
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

    def test_health(self) -> bool:
        """测试健康检查端点"""
        self.log("测试：健康检查")
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log(f"健康检查通过: {data.get('status', 'unknown')}", "PASS")
                return True
            else:
                self.log(f"健康检查失败: HTTP {response.status_code}", "FAIL")
                return False
        except Exception as e:
            self.log(f"健康检查异常: {str(e)}", "FAIL")
            return False

    def test_login(self) -> bool:
        """测试登录端点"""
        self.log("测试：用户登录")
        try:
            payload = {
                "username": "admin",
                "password": "admin123"
            }
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=payload,
                timeout=10
            )

            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                self.token = data.get('access_token')
                if self.token:
                    self.log("登录成功，已获取 token", "PASS")
                    return True
                else:
                    self.log("登录响应中缺少 token", "WARN")
                    return False
            else:
                self.log(f"登录失败: HTTP {response.status_code}", "FAIL")
                self.log(f"响应: {response.text[:200]}", "WARN")
                return False
        except Exception as e:
            self.log(f"登录测试异常: {str(e)}", "FAIL")
            return False

    def test_get_user_info(self) -> bool:
        """测试获取用户信息端点"""
        self.log("测试：获取用户信息")
        if not self.token:
            self.log("未登录，跳过用户信息测试", "WARN")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/auth/me",
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                self.log(f"成功获取用户信息", "PASS")
                return True
            else:
                self.log(f"获取用户信息失败: HTTP {response.status_code}", "FAIL")
                return False
        except Exception as e:
            self.log(f"获取用户信息异常: {str(e)}", "FAIL")
            return False

    def test_customers_list(self) -> bool:
        """测试客户列表端点"""
        self.log("测试：客户列表")
        if not self.token:
            self.log("未登录，跳过客户列表测试", "WARN")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/customers",
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                self.log(f"成功获取客户列表", "PASS")
                return True
            elif response.status_code == 500:
                self.log("客户列表端点返回 500 错误", "FAIL")
                return False
            else:
                self.log(f"获取客户列表失败: HTTP {response.status_code}", "WARN")
                return False
        except Exception as e:
            self.log(f"客户列表测试异常: {str(e)}", "FAIL")
            return False

    def test_products_list(self) -> bool:
        """测试产品列表端点"""
        self.log("测试：产品列表")
        if not self.token:
            self.log("未登录，跳过产品列表测试", "WARN")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/products",
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                self.log(f"成功获取产品列表", "PASS")
                return True
            elif response.status_code == 500:
                self.log("产品列表端点返回 500 错误", "FAIL")
                return False
            else:
                self.log(f"获取产品列表失败: HTTP {response.status_code}", "WARN")
                return False
        except Exception as e:
            self.log(f"产品列表测试异常: {str(e)}", "FAIL")
            return False

    def test_contracts_list(self) -> bool:
        """测试合同列表端点"""
        self.log("测试：合同列表")
        if not self.token:
            self.log("未登录，跳过合同列表测试", "WARN")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/contracts",
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                self.log(f"成功获取合同列表", "PASS")
                return True
            elif response.status_code == 500:
                self.log("合同列表端点返回 500 错误", "FAIL")
                return False
            else:
                self.log(f"获取合同列表失败: HTTP {response.status_code}", "WARN")
                return False
        except Exception as e:
            self.log(f"合同列表测试异常: {str(e)}", "FAIL")
            return False

    def test_invoices_list(self) -> bool:
        """测试发票列表端点"""
        self.log("测试：发票列表")
        if not self.token:
            self.log("未登录，跳过发票列表测试", "WARN")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/invoices",
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                self.log(f"成功获取发票列表", "PASS")
                return True
            elif response.status_code == 500:
                self.log("发票列表端点返回 500 错误", "FAIL")
                return False
            else:
                self.log(f"获取发票列表失败: HTTP {response.status_code}", "WARN")
                return False
        except Exception as e:
            self.log(f"发票列表测试异常: {str(e)}", "FAIL")
            return False

    def run_all_tests(self) -> int:
        """运行所有测试"""
        print("\n" + "="*60)
        print("🔧 企账通（QZT）后端 API 测试")
        print("="*60 + "\n")

        # 运行测试
        self.test_health()
        self.test_login()
        self.test_get_user_info()
        self.test_customers_list()
        self.test_products_list()
        self.test_contracts_list()
        self.test_invoices_list()

        # 打印测试结果摘要
        print("\n" + "="*60)
        print("📊 API 测试结果摘要")
        print("="*60)

        passed = sum(1 for r in self.results if r['status'] == 'PASS')
        failed = sum(1 for r in self.results if r['status'] == 'FAIL')
        total = len(self.results)

        print(f"\n总计: {total} 个测试")
        print(f"✅ 通过: {passed}")
        print(f"❌ 失败: {failed}")
        print(f"通过率: {(passed/total*100):.1f}%" if total > 0 else "通过率: N/A")

        if failed == 0:
            print("\n🎉 所有 API 测试通过！")
            return 0
        else:
            print(f"\n⚠️  {failed} 个 API 测试失败")
            return 1

if __name__ == '__main__':
    import sys
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:7890"
    tester = APITest(base_url)
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)
