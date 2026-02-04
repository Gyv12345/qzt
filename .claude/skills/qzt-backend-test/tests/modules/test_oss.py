#!/usr/bin/env python3
"""
OSS 模块 API 测试
自动生成于: 2026-02-04T09:59:12.988887
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class OssTest(TestBase):
    """oss 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "oss"


    def test_post_0(self):
        """测试: 上传文件"""
        self.test_endpoint(
            "POST", "/oss/upload",
            "上传文件",
            expect_status=200,
            require_auth=true
        )

    def test_post_1(self):
        """测试: 获取上传授权 URL（前端直传）"""
        self.test_endpoint(
            "POST", "/oss/upload-url",
            "获取上传授权 URL（前端直传）",
            expect_status=200,
            require_auth=true
        )

    def test_get_2(self):
        """测试: 分页查询文件列表"""
        self.test_endpoint(
            "GET", "/oss/files",
            "分页查询文件列表",
            expect_status=200,
            require_auth=true
        )

    def test_get_3(self):
        """测试: 获取存储空间使用统计"""
        self.test_endpoint(
            "GET", "/oss/usage",
            "获取存储空间使用统计",
            expect_status=200,
            require_auth=true
        )

    def test_get_4(self):
        """测试: 获取文件详情"""
        self.test_endpoint(
            "GET", "/oss/files/test-id",
            "获取文件详情",
            expect_status=200,
            require_auth=true
        )

    def test_delete_5(self):
        """测试: 删除文件"""
        self.test_endpoint(
            "DELETE", "/oss/files/test-id",
            "删除文件",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"Oss 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_post_1()
        self.test_get_2()
        self.test_get_3()
        self.test_get_4()
        self.test_delete_5()

        self.print_summary()
