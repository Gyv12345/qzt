#!/usr/bin/env python3
"""
SOCIAL_MEDIA 模块 API 测试
自动生成于: 2026-02-04T09:59:12.989018
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class SocialMediaTest(TestBase):
    """social_media 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "social_media"


    def test_post_0(self):
        """测试: 创建新媒体账号"""
        self.test_endpoint(
            "POST", "/social-media/accounts",
            "创建新媒体账号",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 获取新媒体账号列表"""
        self.test_endpoint(
            "GET", "/social-media/accounts",
            "获取新媒体账号列表",
            expect_status=200,
            require_auth=true
        )

    def test_put_2(self):
        """测试: 更新新媒体账号"""
        self.test_endpoint(
            "PUT", "/social-media/accounts/test-id",
            "更新新媒体账号",
            expect_status=200,
            require_auth=true
        )

    def test_delete_3(self):
        """测试: 删除新媒体账号"""
        self.test_endpoint(
            "DELETE", "/social-media/accounts/test-id",
            "删除新媒体账号",
            expect_status=200,
            require_auth=true
        )

    def test_get_4(self):
        """测试: 获取新媒体账号详情"""
        self.test_endpoint(
            "GET", "/social-media/accounts/test-id",
            "获取新媒体账号详情",
            expect_status=200,
            require_auth=true
        )

    def test_post_5(self):
        """测试: 刷新访问令牌"""
        self.test_endpoint(
            "POST", "/social-media/accounts/refresh-token",
            "刷新访问令牌",
            expect_status=200,
            require_auth=true
        )

    def test_get_6(self):
        """测试: 验证账号有效性"""
        self.test_endpoint(
            "GET", "/social-media/accounts/test-id/validate",
            "验证账号有效性",
            expect_status=200,
            require_auth=true
        )

    def test_post_7(self):
        """测试: 创建新媒体内容"""
        self.test_endpoint(
            "POST", "/social-media/posts",
            "创建新媒体内容",
            expect_status=200,
            require_auth=true
        )

    def test_get_8(self):
        """测试: 获取新媒体内容列表"""
        self.test_endpoint(
            "GET", "/social-media/posts",
            "获取新媒体内容列表",
            expect_status=200,
            require_auth=true
        )

    def test_put_9(self):
        """测试: 更新新媒体内容"""
        self.test_endpoint(
            "PUT", "/social-media/posts/test-id",
            "更新新媒体内容",
            expect_status=200,
            require_auth=true
        )

    def test_delete_10(self):
        """测试: 删除新媒体内容"""
        self.test_endpoint(
            "DELETE", "/social-media/posts/test-id",
            "删除新媒体内容",
            expect_status=200,
            require_auth=true
        )

    def test_get_11(self):
        """测试: 获取新媒体内容详情"""
        self.test_endpoint(
            "GET", "/social-media/posts/test-id",
            "获取新媒体内容详情",
            expect_status=200,
            require_auth=true
        )

    def test_post_12(self):
        """测试: 发布内容"""
        self.test_endpoint(
            "POST", "/social-media/posts/publish",
            "发布内容",
            expect_status=200,
            require_auth=true
        )

    def test_post_13(self):
        """测试: 定时发布"""
        self.test_endpoint(
            "POST", "/social-media/posts/schedule",
            "定时发布",
            expect_status=200,
            require_auth=true
        )

    def test_post_14(self):
        """测试: 取消定时发布"""
        self.test_endpoint(
            "POST", "/social-media/posts/cancel-schedule/test-id",
            "取消定时发布",
            expect_status=200,
            require_auth=true
        )

    def test_post_15(self):
        """测试: 批量发布"""
        self.test_endpoint(
            "POST", "/social-media/posts/batch-publish",
            "批量发布",
            expect_status=200,
            require_auth=true
        )

    def test_get_16(self):
        """测试: 查询内容发布日志"""
        self.test_endpoint(
            "GET", "/social-media/posts/test-id/publish-logs",
            "查询内容发布日志",
            expect_status=200,
            require_auth=true
        )

    def test_get_17(self):
        """测试: 查询所有发布日志"""
        self.test_endpoint(
            "GET", "/social-media/posts/publish-logs",
            "查询所有发布日志",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"SocialMedia 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_get_1()
        self.test_put_2()
        self.test_delete_3()
        self.test_get_4()
        self.test_post_5()
        self.test_get_6()
        self.test_post_7()
        self.test_get_8()
        self.test_put_9()
        self.test_delete_10()
        self.test_get_11()
        self.test_post_12()
        self.test_post_13()
        self.test_post_14()
        self.test_post_15()
        self.test_get_16()
        self.test_get_17()

        self.print_summary()
