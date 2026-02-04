#!/usr/bin/env python3
"""
WEBHOOK 模块 API 测试
自动生成于: 2026-02-04T09:59:12.988801
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class WebhookTest(TestBase):
    """webhook 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "webhook"


    def test_post_0(self):
        """测试: 发送 Webhook 消息"""
        self.test_endpoint(
            "POST", "/webhook/send",
            "发送 Webhook 消息",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 获取 Webhook 配置列表"""
        self.test_endpoint(
            "GET", "/webhook/configs",
            "获取 Webhook 配置列表",
            expect_status=200,
            require_auth=true
        )

    def test_post_2(self):
        """测试: 创建 Webhook 配置"""
        self.test_endpoint(
            "POST", "/webhook/configs",
            "创建 Webhook 配置",
            expect_status=200,
            require_auth=true
        )

    def test_patch_3(self):
        """测试: 更新 Webhook 配置"""
        self.test_endpoint(
            "PATCH", "/webhook/configs/test-id",
            "更新 Webhook 配置",
            expect_status=200,
            require_auth=true
        )

    def test_delete_4(self):
        """测试: 删除 Webhook 配置"""
        self.test_endpoint(
            "DELETE", "/webhook/configs/test-id",
            "删除 Webhook 配置",
            expect_status=200,
            require_auth=true
        )

    def test_post_5(self):
        """测试: 测试 Webhook 发送"""
        self.test_endpoint(
            "POST", "/webhook/test",
            "测试 Webhook 发送",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"Webhook 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_get_1()
        self.test_post_2()
        self.test_patch_3()
        self.test_delete_4()
        self.test_post_5()

        self.print_summary()
