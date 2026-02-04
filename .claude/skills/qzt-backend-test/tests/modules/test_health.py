#!/usr/bin/env python3
"""
HEALTH 模块 API 测试
自动生成于: 2026-02-04T10:25:51.728687
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from utils.test_base import TestBase


class HealthTest(TestBase):
    """health 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "health"


    def test_get_0(self):
        """测试: """
        self.test_endpoint(
        "GET", "/health",
        "",
        expect_status=200,
        require_auth=False
    )


    def run_crud_tests(self):
        """运行完整的 CRUD 测试流程"""
        print("\n" + "="*60)
        print(f"Health 模块 CRUD 测试")
        print("="*60 + "\n")

        # 1. 查询列表
        # 列表测试在索引 0
        if "test_get" in str(dir(self)):
            try:
                list_method = getattr(self, "test_get_0", None)
                if list_method:
                    list_method()
            except:
                pass

        # 2. 创建资源
        # 无创建测试
        if "test_post" in str(dir(self)):
            try:
                create_method = getattr(self, "test_post_0", None)
                if create_method:
                    create_method()
            except:
                pass

        # 3. 查询详情（使用创建的 ID）
        # 无详情测试
        if hasattr(self, 'test_get_1'):
            try:
                detail_method = getattr(self, "test_get_1", None)
                if detail_method:
                    # 替换路径中的 ID
                    resource_id = self.get_resource_id('health')
                    if resource_id:
                        detail_method()
            except:
                pass

        # 4. 更新资源（使用创建的 ID）
        # 无更新测试
        if hasattr(self, 'test_patch_0'):
            try:
                update_method = getattr(self, "test_patch_0", None)
                if update_method:
                    resource_id = self.get_resource_id('health')
                    if resource_id:
                        update_method()
            except:
                pass

        # 5. 删除资源（使用创建的 ID）
        # 无删除测试
        if hasattr(self, 'test_delete_0'):
            try:
                delete_method = getattr(self, "test_delete_0", None)
                if delete_method:
                    resource_id = self.get_resource_id('health')
                    if resource_id:
                        delete_method()
            except:
                pass

        self.print_summary()

        # 清理资源
        # self.cleanup_resources()

    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"Health 模块测试")
        print("="*60 + "\n")

        self.test_get_0()

        self.print_summary()
