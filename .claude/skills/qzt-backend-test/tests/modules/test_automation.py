#!/usr/bin/env python3
"""
AUTOMATION 模块 API 测试
自动生成于: 2026-02-04T09:59:12.988448
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class AutomationTest(TestBase):
    """automation 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "automation"


    def test_post_0(self):
        """测试: 创建自动化规则"""
        self.test_endpoint(
            "POST", "/automation/rules",
            "创建自动化规则",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 查询所有自动化规则"""
        self.test_endpoint(
            "GET", "/automation/rules",
            "查询所有自动化规则",
            expect_status=200,
            require_auth=true
        )

    def test_get_2(self):
        """测试: 查询单个规则"""
        self.test_endpoint(
            "GET", "/automation/rules/test-id",
            "查询单个规则",
            expect_status=200,
            require_auth=true
        )

    def test_patch_3(self):
        """测试: 更新规则"""
        self.test_endpoint(
            "PATCH", "/automation/rules/test-id",
            "更新规则",
            expect_status=200,
            require_auth=true
        )

    def test_delete_4(self):
        """测试: 删除规则"""
        self.test_endpoint(
            "DELETE", "/automation/rules/test-id",
            "删除规则",
            expect_status=200,
            require_auth=true
        )

    def test_patch_5(self):
        """测试: 启用/禁用规则"""
        self.test_endpoint(
            "PATCH", "/automation/rules/test-id/toggle",
            "启用/禁用规则",
            expect_status=200,
            require_auth=true
        )

    def test_post_6(self):
        """测试: 手动触发规则"""
        self.test_endpoint(
            "POST", "/automation/rules/test-id/trigger",
            "手动触发规则",
            expect_status=200,
            require_auth=true
        )

    def test_get_7(self):
        """测试: 查询任务执行历史"""
        self.test_endpoint(
            "GET", "/automation/tasks/history",
            "查询任务执行历史",
            expect_status=200,
            require_auth=true
        )

    def test_get_8(self):
        """测试: 查询当前用户通知"""
        self.test_endpoint(
            "GET", "/automation/notifications",
            "查询当前用户通知",
            expect_status=200,
            require_auth=true
        )

    def test_patch_9(self):
        """测试: 标记通知为已读"""
        self.test_endpoint(
            "PATCH", "/automation/notifications/test-id/read",
            "标记通知为已读",
            expect_status=200,
            require_auth=true
        )

    def test_patch_10(self):
        """测试: 标记所有通知为已读"""
        self.test_endpoint(
            "PATCH", "/automation/notifications/read-all",
            "标记所有通知为已读",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"Automation 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_get_1()
        self.test_get_2()
        self.test_patch_3()
        self.test_delete_4()
        self.test_patch_5()
        self.test_post_6()
        self.test_get_7()
        self.test_get_8()
        self.test_patch_9()
        self.test_patch_10()

        self.print_summary()
