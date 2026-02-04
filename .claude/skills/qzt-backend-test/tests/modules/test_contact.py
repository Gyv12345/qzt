#!/usr/bin/env python3
"""
CONTACT 模块 API 测试
自动生成于: 2026-02-04T09:59:12.987113
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class ContactTest(TestBase):
    """contact 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "contact"


    def test_post_0(self):
        """测试: 创建联系人"""
        self.test_endpoint(
            "POST", "/contacts",
            "创建联系人",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 查询联系人列表"""
        self.test_endpoint(
            "GET", "/contacts",
            "查询联系人列表",
            expect_status=200,
            require_auth=true
        )

    def test_get_2(self):
        """测试: 获取联系人详情"""
        self.test_endpoint(
            "GET", "/contacts/test-id",
            "获取联系人详情",
            expect_status=200,
            require_auth=true
        )

    def test_put_3(self):
        """测试: 更新联系人"""
        self.test_endpoint(
            "PUT", "/contacts/test-id",
            "更新联系人",
            expect_status=200,
            require_auth=true
        )

    def test_delete_4(self):
        """测试: 删除联系人"""
        self.test_endpoint(
            "DELETE", "/contacts/test-id",
            "删除联系人",
            expect_status=200,
            require_auth=true
        )

    def test_get_5(self):
        """测试: 通过手机号查找联系人"""
        self.test_endpoint(
            "GET", "/contacts/phone/test-id",
            "通过手机号查找联系人",
            expect_status=200,
            require_auth=true
        )

    def test_post_6(self):
        """测试: 关联公司"""
        self.test_endpoint(
            "POST", "/contacts/test-id/companies",
            "关联公司",
            expect_status=200,
            require_auth=true
        )

    def test_delete_7(self):
        """测试: 取消关联公司"""
        self.test_endpoint(
            "DELETE", "/contacts/test-id/companies/test-id",
            "取消关联公司",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"Contact 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_get_1()
        self.test_get_2()
        self.test_put_3()
        self.test_delete_4()
        self.test_get_5()
        self.test_post_6()
        self.test_delete_7()

        self.print_summary()
