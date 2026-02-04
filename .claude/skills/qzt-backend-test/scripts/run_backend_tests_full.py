#!/usr/bin/env python3
"""
企账通后端 API 完整测试脚本
支持自动化测试所有后端接口的CRUD操作
"""

import requests
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import sys
import random
import string


class QZTBackendTestFull:
    """企账通后端完整测试框架 - 包含CRUD操作"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.test_results: List[Dict[str, Any]] = []
        self.passed = 0
        self.failed = 0
        # 存储测试创建的资源ID，用于后续清理
        self.created_resource_ids: Dict[str, List[str]] = {
            "customers": [],
            "follow_records": [],
            "contracts": [],
            "invoices": [],
            "payments": [],
            "contacts": [],
            "products": [],
            "departments": [],
            "users": []
        }

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
                result = response.json()
                data = result.get('data', {})
                self.token = data.get('access_token')
                if self.token:
                    self.log("登录成功，已获取 token", "PASS")
                    return True
                else:
                    self.log("登录响应中缺少 token", "FAIL")
                    self.log(f"响应内容: {json.dumps(result, indent=2, ensure_ascii=False)}", "WARN")
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
        require_auth: bool = True,
        return_response: bool = False
    ) -> Tuple[bool, Optional[Dict]]:
        """测试单个 API 端点"""
        self.log(f"测试: {description}", "START")

        if require_auth and not self.token:
            self.log("需要认证但未登录，跳过测试", "WARN")
            return False, None

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
                if return_response:
                    try:
                        return True, response.json()
                    except:
                        return True, {"data": response.text}
                return True, None
            else:
                self.log(
                    f"{description} - 失败: 期望 {expect_status}, 实际 {response.status_code}",
                    "FAIL"
                )
                return False, None

        except Exception as e:
            self.log(f"{description} - 异常: {str(e)}", "FAIL")
            return False, None

    def generate_random_string(self, length: int = 8) -> str:
        """生成随机字符串"""
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

    def test_customer_crud(self):
        """测试客户管理完整CRUD"""
        self.log("\n========== 测试客户管理 CRUD ==========", "START")

        # 1. 创建客户
        customer_data = {
            "name": f"测试客户_{self.generate_random_string()}",
            "shortName": "测试客户",
            "industry": "互联网",
            "scale": "11-50人",
            "address": "测试地址"
        }

        success, result = self.test_endpoint(
            "POST", "/customers", "创建客户",
            data=customer_data,
            expect_status=201,
            require_auth=True,
            return_response=True
        )

        if not success or not result:
            self.log("无法创建测试客户，跳过后续测试", "WARN")
            return

        customer_id = result.get('data', {}).get('id')
        if not customer_id:
            self.log("创建客户响应中缺少ID", "FAIL")
            return

        self.created_resource_ids["customers"].append(customer_id)
        self.log(f"客户ID: {customer_id}", "INFO")

        # 2. 查询客户详情
        self.test_endpoint(
            "GET", f"/customers/{customer_id}", "查询客户详情",
            expect_status=200,
            require_auth=True
        )

        # 3. 更新客户
        update_data = {
            "name": f"更新客户_{self.generate_random_string()}",
            "industry": "金融",
            "scale": "51-200人"
        }

        self.test_endpoint(
            "PATCH", f"/customers/{customer_id}", "更新客户",
            data=update_data,
            expect_status=200,
            require_auth=True
        )

        # 4. 删除客户（可选，取决于是否需要清理测试数据）
        # self.test_endpoint(
        #     "DELETE", f"/customers/{customer_id}", "删除客户",
        #     expect_status=200,
        #     require_auth=True
        # )

    def test_follow_record_crud(self):
        """测试跟进记录完整CRUD"""
        self.log("\n========== 测试跟进记录 CRUD ==========", "START")

        # 需要先有客户ID，使用第一个存在的客户或者创建一个新的
        follow_record_data = {
            "customerId": "test_customer_id",  # 需要替换为实际的客户ID
            "content": f"测试跟进内容_{self.generate_random_string()}",
            "followType": "PHONE",
            "status": "COMPLETED"
        }

        # 由于需要真实客户ID，这里先测试查询和创建接口
        # 实际测试中应该先创建客户，再创建跟进记录

    def test_contract_crud(self):
        """测试合同管理完整CRUD"""
        self.log("\n========== 测试合同管理 CRUD ==========", "START")

        # 1. 创建合同
        contract_data = {
            "customerId": "test_customer_id",  # 需要真实客户ID
            "name": f"测试合同_{self.generate_random_string()}",
            "contractNo": f"CONTRACT-{self.generate_random_string(6)}",
            "amount": 10000,
            "startDate": "2026-01-01",
            "endDate": "2026-12-31",
            "status": "ACTIVE"
        }

        # 由于需要真实客户ID，这里先跳过
        self.log("跳过合同创建测试（需要真实客户ID）", "WARN")

    def test_product_crud(self):
        """测试产品管理完整CRUD"""
        self.log("\n========== 测试产品管理 CRUD ==========", "START")

        # 1. 创建产品
        product_data = {
            "name": f"测试产品_{self.generate_random_string()}",
            "code": f"PROD-{self.generate_random_string(6)}",
            "description": "这是一个测试产品",
            "price": 1000,
            "invoiceLimit": 10,
            "invoiceCount": 50,
            "overLimitPrice": 20
        }

        success, result = self.test_endpoint(
            "POST", "/products", "创建产品",
            data=product_data,
            expect_status=201,
            require_auth=True,
            return_response=True
        )

        if success and result:
            product_id = result.get('data', {}).get('id')
            if product_id:
                self.created_resource_ids["products"].append(product_id)
                self.log(f"产品ID: {product_id}", "INFO")

                # 2. 查询产品详情
                self.test_endpoint(
                    "GET", f"/products/{product_id}", "查询产品详情",
                    expect_status=200,
                    require_auth=True
                )

                # 3. 更新产品
                update_data = {
                    "name": f"更新产品_{self.generate_random_string()}",
                    "price": 1500,
                    "invoiceLimit": 15,
                    "invoiceCount": 60,
                    "overLimitPrice": 25
                }

                self.test_endpoint(
                    "PATCH", f"/products/{product_id}", "更新产品",
                    data=update_data,
                    expect_status=200,
                    require_auth=True
                )

    def test_department_crud(self):
        """测试部门管理完整CRUD"""
        self.log("\n========== 测试部门管理 CRUD ==========", "START")

        # 1. 创建部门
        department_data = {
            "name": f"测试部门_{self.generate_random_string()}",
            "status": 1,
            "sort": 0
        }

        success, result = self.test_endpoint(
            "POST", "/departments", "创建部门",
            data=department_data,
            expect_status=201,
            require_auth=True,
            return_response=True
        )

        if success and result:
            dept_id = result.get('data', {}).get('id')
            if dept_id:
                self.created_resource_ids["departments"].append(dept_id)
                self.log(f"部门ID: {dept_id}", "INFO")

                # 2. 查询部门详情
                self.test_endpoint(
                    "GET", f"/departments/{dept_id}", "查询部门详情",
                    expect_status=200,
                    require_auth=True
                )

                # 3. 更新部门
                update_data = {
                    "name": f"更新部门_{self.generate_random_string()}"
                }

                self.test_endpoint(
                    "PATCH", f"/departments/{dept_id}", "更新部门",
                    data=update_data,
                    expect_status=200,
                    require_auth=True
                )

    def test_contact_crud(self):
        """测试联系人管理完整CRUD"""
        self.log("\n========== 测试联系人管理 CRUD ==========", "START")

        # 1. 创建联系人
        # 生成有效的中国手机号：1 + 3-9 + 9位数字
        phone = f"1{random.randint(3, 9)}{random.randint(100000000, 999999999)}"
        contact_data = {
            "name": f"测试联系人_{self.generate_random_string()}",
            "phone": phone,
            "email": "contact@example.com",
            "position": "经理",
            "department": "技术部"
        }

        success, result = self.test_endpoint(
            "POST", "/contacts", "创建联系人",
            data=contact_data,
            expect_status=201,
            require_auth=True,
            return_response=True
        )

        if success and result:
            contact_id = result.get('data', {}).get('id')
            if contact_id:
                self.created_resource_ids["contacts"].append(contact_id)
                self.log(f"联系人ID: {contact_id}", "INFO")

                # 2. 查询联系人详情
                self.test_endpoint(
                    "GET", f"/contacts/{contact_id}", "查询联系人详情",
                    expect_status=200,
                    require_auth=True
                )

                # 3. 更新联系人
                update_data = {
                    "name": f"更新联系人_{self.generate_random_string()}",
                    "position": "总监"
                }

                self.test_endpoint(
                    "PUT", f"/contacts/{contact_id}", "更新联系人",
                    data=update_data,
                    expect_status=200,
                    require_auth=True
                )

    def cleanup_test_data(self):
        """清理测试数据"""
        self.log("\n========== 清理测试数据 ==========", "START")

        # 清理创建的资源
        for resource_type, ids in self.created_resource_ids.items():
            for resource_id in ids:
                endpoint_map = {
                    "customers": f"/customers/{resource_id}",
                    "contacts": f"/contacts/{resource_id}",
                    "products": f"/products/{resource_id}",
                    "departments": f"/departments/{resource_id}"
                }

                if resource_type in endpoint_map:
                    self.test_endpoint(
                        "DELETE", endpoint_map[resource_type],
                        f"清理测试{resource_type}: {resource_id}",
                        expect_status=200,
                        require_auth=True
                    )

    def run_all_tests(self):
        """运行所有后端 API 测试"""
        print("\n" + "="*60)
        print("企账通后端 API 完整测试套件 (CRUD)")
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

        # 4. 查询类测试（原有测试）
        self.log("\n========== 查询类接口测试 ==========", "START")
        self.test_endpoint("GET", "/customers", "查询客户列表", params={"page": 1, "pageSize": 10})
        self.test_endpoint("GET", "/follow-records", "查询跟进记录", params={"page": 1, "pageSize": 10})
        self.test_endpoint("GET", "/contracts", "查询合同列表", params={"page": 1, "pageSize": 10})
        self.test_endpoint("GET", "/invoices", "查询发票列表", params={"page": 1, "pageSize": 10})
        self.test_endpoint("GET", "/payments", "查询收款记录", params={"page": 1, "pageSize": 10})
        self.test_endpoint("GET", "/service-teams", "查询服务团队")
        self.test_endpoint("GET", "/pricing/rules", "查询定价规则")
        self.test_endpoint("GET", "/products", "查询产品列表")
        self.test_endpoint("GET", "/contacts", "查询联系人列表")
        self.test_endpoint("GET", "/departments", "查询部门列表")
        self.test_endpoint("GET", "/rules/triggers", "查询触发器")
        self.test_endpoint("GET", "/statistics/sales-performance", "查询业绩统计")
        self.test_endpoint("GET", "/system/common-phrases", "查询常用语")
        self.test_endpoint("GET", "/permissions/permissions", "查询权限列表")
        self.test_endpoint("GET", "/permissions/roles", "查询角色列表")

        # 5. CRUD 完整测试
        self.test_customer_crud()
        self.test_product_crud()
        self.test_department_crud()
        self.test_contact_crud()

        # 6. 清理测试数据（可选）
        # self.cleanup_test_data()

        self.print_summary()

    def print_summary(self):
        """打印测试摘要"""
        print("\n" + "="*60)
        print("测试摘要")
        print("="*60)
        total = self.passed + self.failed
        print(f"总计: {total} 个测试")
        print(f"✅ 通过: {self.passed}")
        print(f"❌ 失败: {self.failed}")
        if total > 0:
            print(f"通过率: {self.passed / total * 100:.1f}%")

        # 显示创建的资源
        if any(self.created_resource_ids.values()):
            print("\n创建的测试资源:")
            for resource_type, ids in self.created_resource_ids.items():
                if ids:
                    print(f"  - {resource_type}: {len(ids)} 个")
        print("="*60 + "\n")


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="企账通后端 API 完整测试")
    parser.add_argument("--url", default="http://localhost:7890", help="后端服务 URL")
    parser.add_argument("--username", default="admin", help="测试用户名")
    parser.add_argument("--password", default="admin123", help="测试密码")
    parser.add_argument("--output", help="测试报告输出文件 (JSON 格式)")
    parser.add_argument("--cleanup", action="store_true", help="测试完成后清理测试数据")

    args = parser.parse_args()

    tester = QZTBackendTestFull(base_url=args.url)
    tester.run_all_tests()

    if args.cleanup:
        tester.cleanup_test_data()

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump({
                "results": tester.test_results,
                "summary": {
                    "total": tester.passed + tester.failed,
                    "passed": tester.passed,
                    "failed": tester.failed,
                    "pass_rate": tester.passed / (tester.passed + tester.failed) * 100 if (tester.passed + tester.failed) > 0 else 0
                },
                "created_resources": tester.created_resource_ids
            }, f, ensure_ascii=False, indent=2)
        print(f"✅ 测试报告已保存到: {args.output}")

    sys.exit(0 if tester.failed == 0 else 1)


if __name__ == "__main__":
    main()
