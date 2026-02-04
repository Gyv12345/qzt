#!/usr/bin/env python3
"""
AUTOMATION 模块 API 测试
自动生成于: 2026-02-04T10:25:51.745697
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from utils.test_base import TestBase


class AutomationTest(TestBase):
    """automation 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "automation"


    def test_post_0(self):
        """测试: 创建自动化规则"""
        data = self.get_test_data("post_0")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "POST", "/automation/rules",
                "创建自动化规则",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True,
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: 创建自动化规则 (缺少测试数据)", "WARN")

    def test_get_1(self):
        """测试: 查询所有自动化规则"""
        self.test_endpoint(
        "GET", "/automation/rules",
        "查询所有自动化规则",
        expect_status=200,
        require_auth=True
    )

    def test_get_2(self):
        """测试: 查询单个规则"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/automation/rules/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "GET", actual_path,
                "查询单个规则",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 查询单个规则 (没有可用的资源 ID)", "WARN")

    def test_patch_3(self):
        """测试: 更新规则"""
        data = self.get_test_data("patch_3")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PATCH", "/automation/rules/test-id",
                "更新规则",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 更新规则 (缺少测试数据)", "WARN")

    def test_delete_4(self):
        """测试: 删除规则"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/automation/rules/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "DELETE", actual_path,
                "删除规则",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 删除规则 (没有可用的资源 ID)", "WARN")

    def test_patch_5(self):
        """测试: 启用/禁用规则"""
        data = self.get_test_data("patch_5")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PATCH", "/automation/rules/test-id/toggle",
                "启用/禁用规则",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 启用/禁用规则 (缺少测试数据)", "WARN")

    def test_post_6(self):
        """测试: 手动触发规则"""
        data = self.get_test_data("post_6")
        if data and data.get("request_body"):
            self.test_endpoint(
                "POST", "/automation/rules/test-id/trigger",
                "手动触发规则",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 手动触发规则 (缺少测试数据)", "WARN")

    def test_get_7(self):
        """测试: 查询任务执行历史"""
        self.test_endpoint(
        "GET", "/automation/tasks/history",
        "查询任务执行历史",
        expect_status=200,
        require_auth=True
    )

    def test_get_8(self):
        """测试: 查询当前用户通知"""
        self.test_endpoint(
        "GET", "/automation/notifications",
        "查询当前用户通知",
        expect_status=200,
        require_auth=True
    )

    def test_patch_9(self):
        """测试: 标记通知为已读"""
        data = self.get_test_data("patch_9")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PATCH", "/automation/notifications/test-id/read",
                "标记通知为已读",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 标记通知为已读 (缺少测试数据)", "WARN")

    def test_patch_10(self):
        """测试: 标记所有通知为已读"""
        data = self.get_test_data("patch_10")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PATCH", "/automation/notifications/read-all",
                "标记所有通知为已读",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 标记所有通知为已读 (缺少测试数据)", "WARN")


    def run_crud_tests(self):
        """运行完整的 CRUD 测试流程"""
        print("\n" + "="*60)
        print(f"Automation 模块 CRUD 测试")
        print("="*60 + "\n")

        # 1. 查询列表
        # 列表测试在索引 1
        if "test_get" in str(dir(self)):
            try:
                list_method = getattr(self, "test_get_0", None)
                if list_method:
                    list_method()
            except:
                pass

        # 2. 创建资源
        # 创建测试在索引 0
        if "test_post" in str(dir(self)):
            try:
                create_method = getattr(self, "test_post_0", None)
                if create_method:
                    create_method()
            except:
                pass

        # 3. 查询详情（使用创建的 ID）
        # 详情测试在索引 2
        if hasattr(self, 'test_get_1'):
            try:
                detail_method = getattr(self, "test_get_1", None)
                if detail_method:
                    # 替换路径中的 ID
                    resource_id = self.get_resource_id('automation')
                    if resource_id:
                        detail_method()
            except:
                pass

        # 4. 更新资源（使用创建的 ID）
        # 更新测试在索引 3
        if hasattr(self, 'test_patch_0'):
            try:
                update_method = getattr(self, "test_patch_0", None)
                if update_method:
                    resource_id = self.get_resource_id('automation')
                    if resource_id:
                        update_method()
            except:
                pass

        # 5. 删除资源（使用创建的 ID）
        # 删除测试在索引 4
        if hasattr(self, 'test_delete_0'):
            try:
                delete_method = getattr(self, "test_delete_0", None)
                if delete_method:
                    resource_id = self.get_resource_id('automation')
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
