#!/usr/bin/env python3
"""
CUSTOMER 模块 CRUD 测试示例
展示正确的测试流程：查询 -> 创建 -> 查询详情 -> 更新 -> 删除
"""

import requests
from typing import Dict, List, Any
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from utils.test_base import TestBase


class CustomerCrudTest(TestBase):
    """客户模块 CRUD 测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "customer"
        self.customer_id = None  # 保存创建的客户 ID

    def test_1_list_customers(self):
        """1. 查询客户列表"""
        self.log("步骤 1: 查询客户列表", "START")
        success, response = self.test_endpoint(
            "GET", "/customers",
            "查询客户列表",
            expect_status=200,
            require_auth=True,
            return_response=True
        )
        return success

    def test_2_create_customer(self):
        """2. 创建新客户"""
        self.log("步骤 2: 创建新客户", "START")

        # 获取测试数据
        data = self.get_test_data("post_5")
        if not data or not data.get("request_body"):
            self.log("⚠️  跳过创建测试 (缺少测试数据)", "WARN")
            return False

        request_body = data.get("request_body", {})
        self.log(f"请求数据: {request_body}", "INFO")

        # 创建客户并保存 ID
        success, response = self.create_with_data(
            "POST", "/customers",
            "创建客户",
            data=request_body,
            expect_status=201,
            require_auth=True,
            resource_type="customer"
        )

        if success and response:
            # 保存客户 ID
            if 'data' in response and isinstance(response['data'], dict):
                self.customer_id = response['data'].get('id')
                if self.customer_id:
                    self.log(f"✅ 创建成功，客户 ID: {self.customer_id}", "INFO")
                else:
                    self.log("⚠️  响应中未找到客户 ID", "WARN")
                    self.log(f"响应内容: {response}", "WARN")
            else:
                self.log(f"⚠️  响应格式异常: {response}", "WARN")
        else:
            self.log("❌ 创建失败", "FAIL")

        return success

    def test_3_get_customer_detail(self):
        """3. 查询客户详情"""
        self.log("步骤 3: 查询客户详情", "START")

        if not self.customer_id:
            self.log("⚠️  跳过详情查询 (没有客户 ID)", "WARN")
            return False

        success, response = self.test_endpoint(
            "GET", f"/customers/{self.customer_id}",
            "查询客户详情",
            expect_status=200,
            require_auth=True,
            return_response=True
        )

        if success and response:
            # 验证返回的数据
            if 'data' in response and isinstance(response['data'], dict):
                customer_name = response['data'].get('name', '')
                self.log(f"✅ 查询到客户: {customer_name}", "INFO")

        return success

    def test_4_update_customer(self):
        """4. 更新客户信息"""
        self.log("步骤 4: 更新客户信息", "START")

        if not self.customer_id:
            self.log("⚠️  跳过更新测试 (没有客户 ID)", "WARN")
            return False

        # 获取测试数据
        data = self.get_test_data("patch_8")
        if not data or not data.get("request_body"):
            self.log("⚠️  跳过更新测试 (缺少测试数据)", "WARN")
            return False

        success, response = self.test_endpoint(
            "PATCH", f"/customers/{self.customer_id}",
            "更新客户",
            data=data.get("request_body", {}),
            expect_status=200,
            require_auth=True,
            return_response=True
        )

        if success:
            self.log(f"✅ 客户 {self.customer_id} 更新成功", "INFO")

        return success

    def test_5_delete_customer(self):
        """5. 删除客户"""
        self.log("步骤 5: 删除客户", "START")

        if not self.customer_id:
            self.log("⚠️  跳过删除测试 (没有客户 ID)", "WARN")
            return False

        success, response = self.test_endpoint(
            "DELETE", f"/customers/{self.customer_id}",
            "删除客户",
            expect_status=200,
            require_auth=True
        )

        if success:
            self.log(f"✅ 客户 {self.customer_id} 已删除", "INFO")
            # 清空 ID
            self.customer_id = None

        return success

    def run_crud_tests(self):
        """运行完整的 CRUD 测试流程"""
        print("\n" + "="*60)
        print("客户模块 CRUD 测试流程")
        print("="*60 + "\n")

        # 按顺序执行测试
        results = []

        # 1. 查询列表
        results.append(self.test_1_list_customers())

        # 2. 创建
        results.append(self.test_2_create_customer())

        # 3. 查询详情
        results.append(self.test_3_get_customer_detail())

        # 4. 更新
        results.append(self.test_4_update_customer())

        # 5. 删除
        results.append(self.test_5_delete_customer())

        # 打印摘要
        self.print_summary()

        # 返回是否全部通过
        return all(results)
