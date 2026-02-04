#!/usr/bin/env python3
"""
FOLLOW_RECORD 模块 API 测试
自动生成于: 2026-02-04T09:59:12.987382
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class FollowRecordTest(TestBase):
    """follow_record 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "follow_record"


    def test_get_0(self):
        """测试: 查询跟进记录列表"""
        self.test_endpoint(
            "GET", "/follow-records",
            "查询跟进记录列表",
            expect_status=200,
            require_auth=true
        )

    def test_post_1(self):
        """测试: 创建跟进记录"""
        self.test_endpoint(
            "POST", "/follow-records",
            "创建跟进记录",
            expect_status=200,
            require_auth=true
        )

    def test_get_2(self):
        """测试: 获取跟进记录详情"""
        self.test_endpoint(
            "GET", "/follow-records/test-id",
            "获取跟进记录详情",
            expect_status=200,
            require_auth=true
        )

    def test_patch_3(self):
        """测试: 更新跟进记录"""
        self.test_endpoint(
            "PATCH", "/follow-records/test-id",
            "更新跟进记录",
            expect_status=200,
            require_auth=true
        )

    def test_delete_4(self):
        """测试: 删除跟进记录"""
        self.test_endpoint(
            "DELETE", "/follow-records/test-id",
            "删除跟进记录",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"FollowRecord 模块测试")
        print("="*60 + "\n")

        self.test_get_0()
        self.test_post_1()
        self.test_get_2()
        self.test_patch_3()
        self.test_delete_4()

        self.print_summary()
