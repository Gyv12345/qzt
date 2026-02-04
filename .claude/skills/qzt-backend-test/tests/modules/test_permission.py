#!/usr/bin/env python3
"""
PERMISSION 模块 API 测试
自动生成于: 2026-02-04T10:25:51.747003
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from utils.test_base import TestBase


class PermissionTest(TestBase):
    """permission 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "permission"


    def test_post_0(self):
        """测试: 同步前端路由到菜单"""
        data = self.get_test_data("post_0")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "POST", "/permissions/sync-menus",
                "同步前端路由到菜单",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True,
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: 同步前端路由到菜单 (缺少测试数据)", "WARN")

    def test_get_1(self):
        """测试: 获取菜单树"""
        self.test_endpoint(
        "GET", "/permissions/menus",
        "获取菜单树",
        expect_status=200,
        require_auth=True
    )

    def test_get_2(self):
        """测试: 获取菜单详情"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/permissions/menus/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "GET", actual_path,
                "获取菜单详情",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 获取菜单详情 (没有可用的资源 ID)", "WARN")

    def test_put_3(self):
        """测试: 更新菜单"""
        data = self.get_test_data("put_3")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PUT", "/permissions/menus/test-id",
                "更新菜单",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 更新菜单 (缺少测试数据)", "WARN")

    def test_delete_4(self):
        """测试: 删除菜单"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/permissions/menus/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "DELETE", actual_path,
                "删除菜单",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 删除菜单 (没有可用的资源 ID)", "WARN")

    def test_post_5(self):
        """测试: 创建权限"""
        data = self.get_test_data("post_5")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "POST", "/permissions/permissions",
                "创建权限",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True,
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: 创建权限 (缺少测试数据)", "WARN")

    def test_get_6(self):
        """测试: 查询所有权限"""
        self.test_endpoint(
        "GET", "/permissions/permissions",
        "查询所有权限",
        expect_status=200,
        require_auth=True
    )

    def test_get_7(self):
        """测试: 获取权限详情"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/permissions/permissions/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "GET", actual_path,
                "获取权限详情",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 获取权限详情 (没有可用的资源 ID)", "WARN")

    def test_put_8(self):
        """测试: 更新权限"""
        data = self.get_test_data("put_8")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PUT", "/permissions/permissions/test-id",
                "更新权限",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 更新权限 (缺少测试数据)", "WARN")

    def test_delete_9(self):
        """测试: 删除权限"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/permissions/permissions/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "DELETE", actual_path,
                "删除权限",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 删除权限 (没有可用的资源 ID)", "WARN")

    def test_post_10(self):
        """测试: 创建角色"""
        data = self.get_test_data("post_10")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "POST", "/permissions/roles",
                "创建角色",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True,
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: 创建角色 (缺少测试数据)", "WARN")

    def test_get_11(self):
        """测试: 查询所有角色"""
        self.test_endpoint(
        "GET", "/permissions/roles",
        "查询所有角色",
        expect_status=200,
        require_auth=True
    )

    def test_get_12(self):
        """测试: 查询单个角色"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/permissions/roles/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "GET", actual_path,
                "查询单个角色",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 查询单个角色 (没有可用的资源 ID)", "WARN")

    def test_put_13(self):
        """测试: 更新角色"""
        data = self.get_test_data("put_13")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PUT", "/permissions/roles/test-id",
                "更新角色",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 更新角色 (缺少测试数据)", "WARN")

    def test_delete_14(self):
        """测试: 删除角色"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/permissions/roles/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "DELETE", actual_path,
                "删除角色",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 删除角色 (没有可用的资源 ID)", "WARN")

    def test_put_15(self):
        """测试: 为角色分配权限"""
        data = self.get_test_data("put_15")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PUT", "/permissions/roles/test-id/permissions",
                "为角色分配权限",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 为角色分配权限 (缺少测试数据)", "WARN")

    def test_get_16(self):
        """测试: 获取用户的所有权限"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/permissions/users/test-id/permissions".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "GET", actual_path,
                "获取用户的所有权限",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 获取用户的所有权限 (没有可用的资源 ID)", "WARN")

    def test_put_17(self):
        """测试: 为用户分配角色"""
        data = self.get_test_data("put_17")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PUT", "/permissions/users/test-id/roles",
                "为用户分配角色",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 为用户分配角色 (缺少测试数据)", "WARN")

    def test_post_18(self):
        """测试: 初始化超级管理员"""
        data = self.get_test_data("post_18")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "POST", "/permissions/initialize-super-admin",
                "初始化超级管理员",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True,
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: 初始化超级管理员 (缺少测试数据)", "WARN")


    def run_crud_tests(self):
        """运行完整的 CRUD 测试流程"""
        print("\n" + "="*60)
        print(f"Permission 模块 CRUD 测试")
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
                    resource_id = self.get_resource_id('permission')
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
                    resource_id = self.get_resource_id('permission')
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
                    resource_id = self.get_resource_id('permission')
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
        print(f"Permission 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_get_1()
        self.test_get_2()
        self.test_put_3()
        self.test_delete_4()
        self.test_post_5()
        self.test_get_6()
        self.test_get_7()
        self.test_put_8()
        self.test_delete_9()
        self.test_post_10()
        self.test_get_11()
        self.test_get_12()
        self.test_put_13()
        self.test_delete_14()
        self.test_put_15()
        self.test_get_16()
        self.test_put_17()
        self.test_post_18()

        self.print_summary()
