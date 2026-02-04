#!/usr/bin/env python3
"""
SYSTEM 模块 API 测试
自动生成于: 2026-02-04T10:25:51.744754
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from utils.test_base import TestBase


class SystemTest(TestBase):
    """system 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "system"


    def test_get_0(self):
        """测试: 获取常用语列表"""
        self.test_endpoint(
        "GET", "/system/common-phrases",
        "获取常用语列表",
        expect_status=200,
        require_auth=True
    )

    def test_post_1(self):
        """测试: 创建常用语"""
        data = self.get_test_data("post_1")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "POST", "/system/common-phrases",
                "创建常用语",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True,
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: 创建常用语 (缺少测试数据)", "WARN")

    def test_patch_2(self):
        """测试: 更新常用语"""
        data = self.get_test_data("patch_2")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PATCH", "/system/common-phrases/test-id",
                "更新常用语",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 更新常用语 (缺少测试数据)", "WARN")

    def test_delete_3(self):
        """测试: 删除常用语"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/system/common-phrases/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "DELETE", actual_path,
                "删除常用语",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 删除常用语 (没有可用的资源 ID)", "WARN")

    def test_get_4(self):
        """测试: 搜索常用语"""
        self.test_endpoint(
        "GET", "/system/common-phrases/search",
        "搜索常用语",
        expect_status=200,
        require_auth=True
    )

    def test_post_5(self):
        """测试: 增加常用语使用次数"""
        data = self.get_test_data("post_5")
        if data and data.get("request_body"):
            self.test_endpoint(
                "POST", "/system/common-phrases/test-id/use",
                "增加常用语使用次数",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 增加常用语使用次数 (缺少测试数据)", "WARN")

    def test_get_6(self):
        """测试: 获取收款账号列表"""
        self.test_endpoint(
        "GET", "/system/payment-accounts",
        "获取收款账号列表",
        expect_status=200,
        require_auth=True
    )

    def test_post_7(self):
        """测试: 创建收款账号"""
        data = self.get_test_data("post_7")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "POST", "/system/payment-accounts",
                "创建收款账号",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True,
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: 创建收款账号 (缺少测试数据)", "WARN")

    def test_get_8(self):
        """测试: 获取默认收款账号"""
        self.test_endpoint(
        "GET", "/system/payment-accounts/default",
        "获取默认收款账号",
        expect_status=200,
        require_auth=True
    )

    def test_patch_9(self):
        """测试: 更新收款账号"""
        data = self.get_test_data("patch_9")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PATCH", "/system/payment-accounts/test-id",
                "更新收款账号",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 更新收款账号 (缺少测试数据)", "WARN")

    def test_delete_10(self):
        """测试: 删除收款账号"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/system/payment-accounts/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "DELETE", actual_path,
                "删除收款账号",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 删除收款账号 (没有可用的资源 ID)", "WARN")

    def test_patch_11(self):
        """测试: 设置默认账号"""
        data = self.get_test_data("patch_11")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PATCH", "/system/payment-accounts/test-id/default",
                "设置默认账号",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 设置默认账号 (缺少测试数据)", "WARN")

    def test_get_12(self):
        """测试: 获取所有系统配置"""
        self.test_endpoint(
        "GET", "/system/config",
        "获取所有系统配置",
        expect_status=200,
        require_auth=True
    )

    def test_get_13(self):
        """测试: 获取公开配置（无需认证）"""
        self.test_endpoint(
        "GET", "/system/config/public",
        "获取公开配置（无需认证）",
        expect_status=200,
        require_auth=True
    )

    def test_get_14(self):
        """测试: 获取基础配置（系统名称、Logo等）"""
        self.test_endpoint(
        "GET", "/system/config/basic",
        "获取基础配置（系统名称、Logo等）",
        expect_status=200,
        require_auth=True
    )

    def test_get_15(self):
        """测试: 获取单个配置"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/system/config/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "GET", actual_path,
                "获取单个配置",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 获取单个配置 (没有可用的资源 ID)", "WARN")

    def test_put_16(self):
        """测试: 创建或更新配置"""
        data = self.get_test_data("put_16")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PUT", "/system/config/test-id",
                "创建或更新配置",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 创建或更新配置 (缺少测试数据)", "WARN")

    def test_delete_17(self):
        """测试: 删除配置"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/system/config/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "DELETE", actual_path,
                "删除配置",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 删除配置 (没有可用的资源 ID)", "WARN")

    def test_post_18(self):
        """测试: 批量更新配置"""
        data = self.get_test_data("post_18")
        if data and data.get("request_body"):
            self.test_endpoint(
                "POST", "/system/config/batch",
                "批量更新配置",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 批量更新配置 (缺少测试数据)", "WARN")


    def run_crud_tests(self):
        """运行完整的 CRUD 测试流程"""
        print("\n" + "="*60)
        print(f"System 模块 CRUD 测试")
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
        # 创建测试在索引 1
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
                    resource_id = self.get_resource_id('system')
                    if resource_id:
                        detail_method()
            except:
                pass

        # 4. 更新资源（使用创建的 ID）
        # 更新测试在索引 2
        if hasattr(self, 'test_patch_0'):
            try:
                update_method = getattr(self, "test_patch_0", None)
                if update_method:
                    resource_id = self.get_resource_id('system')
                    if resource_id:
                        update_method()
            except:
                pass

        # 5. 删除资源（使用创建的 ID）
        # 删除测试在索引 3
        if hasattr(self, 'test_delete_0'):
            try:
                delete_method = getattr(self, "test_delete_0", None)
                if delete_method:
                    resource_id = self.get_resource_id('system')
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
        print(f"System 模块测试")
        print("="*60 + "\n")

        self.test_get_0()
        self.test_post_1()
        self.test_patch_2()
        self.test_delete_3()
        self.test_get_4()
        self.test_post_5()
        self.test_get_6()
        self.test_post_7()
        self.test_get_8()
        self.test_patch_9()
        self.test_delete_10()
        self.test_patch_11()
        self.test_get_12()
        self.test_get_13()
        self.test_get_14()
        self.test_get_15()
        self.test_put_16()
        self.test_delete_17()
        self.test_post_18()

        self.print_summary()
