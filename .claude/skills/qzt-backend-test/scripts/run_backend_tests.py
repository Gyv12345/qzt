#!/usr/bin/env python3
"""
企账通后端 API 测试脚本
支持自动化测试所有后端接口，生成测试报告
"""

import requests
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import sys


class QZTBackendTest:
    """企账通后端测试框架"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.test_results: List[Dict[str, Any]] = []
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

        if status in ["PASS", "FAIL"]:
            self.test_results.append({
                "test": message,
                "status": status,
                "timestamp": datetime.now().isoformat()
            })
            if status == "PASS":
                self.passed += 1
            else:
                self.failed += 1

    def check_server(self) -> bool:
        """检查后端服务是否运行"""
        self.log("检查后端服务状态", "START")
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                self.log(f"后端服务运行正常: {self.base_url}", "PASS")
                return True
            else:
                self.log(f"后端服务响应异常: HTTP {response.status_code}", "FAIL")
                return False
        except requests.exceptions.ConnectionError:
            self.log(f"无法连接到后端服务: {self.base_url}", "FAIL")
            self.log("请确保后端服务正在运行", "WARN")
            return False
        except Exception as e:
            self.log(f"后端服务检查失败: {str(e)}", "FAIL")
            return False

    def login(self, username: str = "admin", password: str = "admin123") -> bool:
        """用户登录"""
        self.log(f"测试用户登录: {username}", "START")
        try:
            payload = {"username": username, "password": password}
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=payload,
                timeout=10
            )

            if response.status_code in [200, 201]:
                data = response.json()
                self.token = data.get('access_token')
                if self.token:
                    self.log("登录成功，已获取 token", "PASS")
                    return True
                else:
                    self.log("登录响应中缺少 token", "FAIL")
                    return False
            else:
                self.log(f"登录失败: HTTP {response.status_code}", "FAIL")
                return False
        except Exception as e:
            self.log(f"登录测试异常: {str(e)}", "FAIL")
            return False

    def test_endpoint(
        self,
        method: str,
        path: str,
        description: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
        expect_status: int = 200,
        require_auth: bool = True
    ) -> bool:
        """测试单个 API 端点"""
        self.log(f"测试: {description}", "START")

        if require_auth and not self.token:
            self.log("需要认证但未登录，跳过测试", "WARN")
            return False

        try:
            headers = {}
            if require_auth:
                headers["Authorization"] = f"Bearer {self.token}"

            url = f"{self.base_url}{path}"
            response = requests.request(
                method=method,
                url=url,
                json=data,
                params=params,
                headers=headers,
                timeout=10
            )

            if response.status_code == expect_status:
                self.log(f"{description} - 成功", "PASS")
                return True
            else:
                self.log(
                    f"{description} - 失败: 期望 {expect_status}, 实际 {response.status_code}",
                    "FAIL"
                )
                return False

        except Exception as e:
            self.log(f"{description} - 异常: {str(e)}", "FAIL")
            return False

    def run_all_tests(self):
        """运行所有后端 API 测试"""
        print("\n" + "="*60)
        print("企账通后端 API 测试套件")
        print("="*60 + "\n")

        # 1. 检查服务
        if not self.check_server():
            self.log("后端服务未运行，终止测试", "FAIL")
            return

        # 2. 登录测试
        if not self.login():
            self.log("登录失败，终止测试", "FAIL")
            return

        # 3. 认证相关测试
        self.test_endpoint(
            "GET", "/auth/me", "获取当前用户信息",
            expect_status=200, require_auth=True
        )

        # 4. 客户管理测试
        self.test_endpoint(
            "GET", "/customers", "查询客户列表",
            params={"page": 1, "pageSize": 10},
            expect_status=200, require_auth=True
        )

        # 5. 跟进记录测试
        self.test_endpoint(
            "GET", "/follow-records", "查询跟进记录",
            params={"page": 1, "pageSize": 10},
            expect_status=200, require_auth=True
        )

        # 6. 合同管理测试
        self.test_endpoint(
            "GET", "/contracts", "查询合同列表",
            params={"page": 1, "pageSize": 10},
            expect_status=200, require_auth=True
        )

        # 7. 发票管理测试
        self.test_endpoint(
            "GET", "/invoices", "查询发票列表",
            params={"page": 1, "pageSize": 10},
            expect_status=200, require_auth=True
        )

        # 8. 收款记录测试
        self.test_endpoint(
            "GET", "/payments", "查询收款记录",
            params={"page": 1, "pageSize": 10},
            expect_status=200, require_auth=True
        )

        # 9. 服务团队测试
        self.test_endpoint(
            "GET", "/service-teams", "查询服务团队",
            expect_status=200, require_auth=True
        )

        # 10. 定价规则测试
        self.test_endpoint(
            "GET", "/pricing/rules", "查询定价规则",
            expect_status=200, require_auth=True
        )

        # 11. 产品流程测试
        self.test_endpoint(
            "GET", "/products/flows", "查询产品流程",
            expect_status=200, require_auth=True
        )

        # 12. 规则引擎测试
        self.test_endpoint(
            "GET", "/rule-engine/triggers", "查询触发器",
            expect_status=200, require_auth=True
        )

        # 13. 统计分析测试
        self.test_endpoint(
            "GET", "/statistics/performance", "查询业绩统计",
            expect_status=200, require_auth=True
        )

        # 14. 系统设置测试
        self.test_endpoint(
            "GET", "/system/common-phrases", "查询常用语",
            expect_status=200, require_auth=True
        )

        self.test_endpoint(
            "GET", "/permissions", "查询权限列表",
            expect_status=200, require_auth=True
        )

        self.print_summary()

    def print_summary(self):
        """打印测试摘要"""
        print("\n" + "="*60)
        print("测试摘要")
        print("="*60)
        print(f"总计: {self.passed + self.failed} 个测试")
        print(f"✅ 通过: {self.passed}")
        print(f"❌ 失败: {self.failed}")
        print(f"通过率: {self.passed / (self.passed + self.failed) * 100:.1f}%")
        print("="*60 + "\n")


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="企账通后端 API 测试")
    parser.add_argument(
        "--url",
        default="http://localhost:7890",
        help="后端服务 URL"
    )
    parser.add_argument(
        "--username",
        default="admin",
        help="测试用户名"
    )
    parser.add_argument(
        "--password",
        default="admin123",
        help="测试密码"
    )
    parser.add_argument(
        "--output",
        help="测试报告输出文件 (JSON 格式)"
    )

    args = parser.parse_args()

    tester = QZTBackendTest(base_url=args.url)
    tester.run_all_tests()

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump({
                "results": tester.test_results,
                "summary": {
                    "total": tester.passed + tester.failed,
                    "passed": tester.passed,
                    "failed": tester.failed,
                    "pass_rate": tester.passed / (tester.passed + tester.failed) * 100
                }
            }, f, ensure_ascii=False, indent=2)
        print(f"✅ 测试报告已保存到: {args.output}")

    sys.exit(0 if tester.failed == 0 else 1)


if __name__ == "__main__":
    main()
