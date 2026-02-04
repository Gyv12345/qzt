#!/usr/bin/env python3
"""
RULE_ENGINE 模块 API 测试
自动生成于: 2026-02-04T09:59:12.988210
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class RuleEngineTest(TestBase):
    """rule_engine 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "rule_engine"


    def test_post_0(self):
        """测试: 创建触发器"""
        self.test_endpoint(
            "POST", "/rules/triggers",
            "创建触发器",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 获取触发器列表"""
        self.test_endpoint(
            "GET", "/rules/triggers",
            "获取触发器列表",
            expect_status=200,
            require_auth=true
        )

    def test_get_2(self):
        """测试: 获取启用的触发器列表"""
        self.test_endpoint(
            "GET", "/rules/triggers/enabled",
            "获取启用的触发器列表",
            expect_status=200,
            require_auth=true
        )

    def test_get_3(self):
        """测试: 获取触发器详情"""
        self.test_endpoint(
            "GET", "/rules/triggers/test-id",
            "获取触发器详情",
            expect_status=200,
            require_auth=true
        )

    def test_patch_4(self):
        """测试: 更新触发器"""
        self.test_endpoint(
            "PATCH", "/rules/triggers/test-id",
            "更新触发器",
            expect_status=200,
            require_auth=true
        )

    def test_delete_5(self):
        """测试: 删除触发器"""
        self.test_endpoint(
            "DELETE", "/rules/triggers/test-id",
            "删除触发器",
            expect_status=200,
            require_auth=true
        )

    def test_patch_6(self):
        """测试: 启用/禁用触发器"""
        self.test_endpoint(
            "PATCH", "/rules/triggers/test-id/toggle",
            "启用/禁用触发器",
            expect_status=200,
            require_auth=true
        )

    def test_post_7(self):
        """测试: 手动执行规则"""
        self.test_endpoint(
            "POST", "/rules/execute/test-id",
            "手动执行规则",
            expect_status=200,
            require_auth=true
        )

    def test_get_8(self):
        """测试: 获取执行日志"""
        self.test_endpoint(
            "GET", "/rules/logs",
            "获取执行日志",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"RuleEngine 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_get_1()
        self.test_get_2()
        self.test_get_3()
        self.test_patch_4()
        self.test_delete_5()
        self.test_patch_6()
        self.test_post_7()
        self.test_get_8()

        self.print_summary()
