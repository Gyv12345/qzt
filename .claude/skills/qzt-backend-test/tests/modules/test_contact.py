#!/usr/bin/env python3
"""
CONTACT 模块 API 测试
自动生成于: 2026-02-04T10:25:51.731306
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from utils.test_base import TestBase


class ContactTest(TestBase):
    """contact 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "contact"


    def test_post_0(self):
        """测试: 创建联系人"""
        data = self.get_test_data("post_0")
        if data and data.get("request_body"):
            self.test_endpoint(
                "POST", "/contacts",
                "创建联系人",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 创建联系人 (缺少测试数据)", "WARN")

    def test_get_1(self):
        """测试: 查询联系人列表"""
        self.test_endpoint(
        "GET", "/contacts",
        "查询联系人列表",
        expect_status=200,
        require_auth=True
    )

    def test_get_2(self):
        """测试: 获取联系人详情"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/contacts/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "GET", actual_path,
                "获取联系人详情",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 获取联系人详情 (没有可用的资源 ID)", "WARN")

    def test_put_3(self):
        """测试: 更新联系人"""
        data = self.get_test_data("put_3")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PUT", "/contacts/test-id",
                "更新联系人",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 更新联系人 (缺少测试数据)", "WARN")

    def test_delete_4(self):
        """测试: 删除联系人"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/contacts/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "DELETE", actual_path,
                "删除联系人",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 删除联系人 (没有可用的资源 ID)", "WARN")

    def test_get_5(self):
        """测试: 通过手机号查找联系人"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/contacts/phone/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "GET", actual_path,
                "通过手机号查找联系人",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 通过手机号查找联系人 (没有可用的资源 ID)", "WARN")

    def test_post_6(self):
        """测试: 关联公司"""
        data = self.get_test_data("post_6")
        if data and data.get("request_body"):
            self.test_endpoint(
                "POST", "/contacts/test-id/companies",
                "关联公司",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 关联公司 (缺少测试数据)", "WARN")

    def test_delete_7(self):
        """测试: 取消关联公司"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/contacts/test-id/companies/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "DELETE", actual_path,
                "取消关联公司",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 取消关联公司 (没有可用的资源 ID)", "WARN")


    def run_crud_tests(self):
        """运行完整的 CRUD 测试流程"""
        print("\n" + "="*60)
        print(f"Contact 模块 CRUD 测试")
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
                    resource_id = self.get_resource_id('contact')
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
                    resource_id = self.get_resource_id('contact')
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
                    resource_id = self.get_resource_id('contact')
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
