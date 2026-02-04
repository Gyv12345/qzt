#!/usr/bin/env python3
"""
CUSTOMER 模块 API 测试
自动生成于: 2026-02-04T09:59:12.987230
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class CustomerTest(TestBase):
    """customer 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "customer"


    def test_post_0(self):
        """测试: 为公司添加联系人（不存在则创建）"""
        self.test_endpoint(
            "POST", "/customers/test-id/contacts",
            "为公司添加联系人（不存在则创建）",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 获取公司的所有联系人"""
        self.test_endpoint(
            "GET", "/customers/test-id/contacts",
            "获取公司的所有联系人",
            expect_status=200,
            require_auth=true
        )

    def test_post_2(self):
        """测试: 关联已有联系人"""
        self.test_endpoint(
            "POST", "/customers/test-id/contacts/link",
            "关联已有联系人",
            expect_status=200,
            require_auth=true
        )

    def test_put_3(self):
        """测试: 更新联系人角色"""
        self.test_endpoint(
            "PUT", "/customers/test-id/contacts/test-id",
            "更新联系人角色",
            expect_status=200,
            require_auth=true
        )

    def test_delete_4(self):
        """测试: 取消关联（标记为离职）"""
        self.test_endpoint(
            "DELETE", "/customers/test-id/contacts/test-id",
            "取消关联（标记为离职）",
            expect_status=200,
            require_auth=true
        )

    def test_post_5(self):
        """测试: 创建客户"""
        self.test_endpoint(
            "POST", "/customers",
            "创建客户",
            expect_status=200,
            require_auth=true
        )

    def test_get_6(self):
        """测试: 获取客户列表"""
        self.test_endpoint(
            "GET", "/customers",
            "获取客户列表",
            expect_status=200,
            require_auth=true
        )

    def test_get_7(self):
        """测试: 获取客户详情"""
        self.test_endpoint(
            "GET", "/customers/test-id",
            "获取客户详情",
            expect_status=200,
            require_auth=true
        )

    def test_patch_8(self):
        """测试: 更新客户"""
        self.test_endpoint(
            "PATCH", "/customers/test-id",
            "更新客户",
            expect_status=200,
            require_auth=true
        )

    def test_delete_9(self):
        """测试: 删除客户"""
        self.test_endpoint(
            "DELETE", "/customers/test-id",
            "删除客户",
            expect_status=200,
            require_auth=true
        )

    def test_patch_10(self):
        """测试: 分配单个客户"""
        self.test_endpoint(
            "PATCH", "/customers/test-id/assign",
            "分配单个客户",
            expect_status=200,
            require_auth=true
        )

    def test_patch_11(self):
        """测试: 批量分配客户"""
        self.test_endpoint(
            "PATCH", "/customers/batch-assign",
            "批量分配客户",
            expect_status=200,
            require_auth=true
        )

    def test_get_12(self):
        """测试: 查询客户分配历史"""
        self.test_endpoint(
            "GET", "/customers/test-id/assignment-history",
            "查询客户分配历史",
            expect_status=200,
            require_auth=true
        )

    def test_get_13(self):
        """测试: 查询客户跟进记录"""
        self.test_endpoint(
            "GET", "/customers/test-id/follow-records",
            "查询客户跟进记录",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"Customer 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_get_1()
        self.test_post_2()
        self.test_put_3()
        self.test_delete_4()
        self.test_post_5()
        self.test_get_6()
        self.test_get_7()
        self.test_patch_8()
        self.test_delete_9()
        self.test_patch_10()
        self.test_patch_11()
        self.test_get_12()
        self.test_get_13()

        self.print_summary()
