#!/usr/bin/env python3
"""
PERMISSION 模块 API 测试
自动生成于: 2026-02-04T09:59:12.988542
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class PermissionTest(TestBase):
    """permission 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "permission"


    def test_post_0(self):
        """测试: 同步前端路由到菜单"""
        self.test_endpoint(
            "POST", "/permissions/sync-menus",
            "同步前端路由到菜单",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 获取菜单树"""
        self.test_endpoint(
            "GET", "/permissions/menus",
            "获取菜单树",
            expect_status=200,
            require_auth=true
        )

    def test_get_2(self):
        """测试: 获取菜单详情"""
        self.test_endpoint(
            "GET", "/permissions/menus/test-id",
            "获取菜单详情",
            expect_status=200,
            require_auth=true
        )

    def test_put_3(self):
        """测试: 更新菜单"""
        self.test_endpoint(
            "PUT", "/permissions/menus/test-id",
            "更新菜单",
            expect_status=200,
            require_auth=true
        )

    def test_delete_4(self):
        """测试: 删除菜单"""
        self.test_endpoint(
            "DELETE", "/permissions/menus/test-id",
            "删除菜单",
            expect_status=200,
            require_auth=true
        )

    def test_post_5(self):
        """测试: 创建权限"""
        self.test_endpoint(
            "POST", "/permissions/permissions",
            "创建权限",
            expect_status=200,
            require_auth=true
        )

    def test_get_6(self):
        """测试: 查询所有权限"""
        self.test_endpoint(
            "GET", "/permissions/permissions",
            "查询所有权限",
            expect_status=200,
            require_auth=true
        )

    def test_get_7(self):
        """测试: 获取权限详情"""
        self.test_endpoint(
            "GET", "/permissions/permissions/test-id",
            "获取权限详情",
            expect_status=200,
            require_auth=true
        )

    def test_put_8(self):
        """测试: 更新权限"""
        self.test_endpoint(
            "PUT", "/permissions/permissions/test-id",
            "更新权限",
            expect_status=200,
            require_auth=true
        )

    def test_delete_9(self):
        """测试: 删除权限"""
        self.test_endpoint(
            "DELETE", "/permissions/permissions/test-id",
            "删除权限",
            expect_status=200,
            require_auth=true
        )

    def test_post_10(self):
        """测试: 创建角色"""
        self.test_endpoint(
            "POST", "/permissions/roles",
            "创建角色",
            expect_status=200,
            require_auth=true
        )

    def test_get_11(self):
        """测试: 查询所有角色"""
        self.test_endpoint(
            "GET", "/permissions/roles",
            "查询所有角色",
            expect_status=200,
            require_auth=true
        )

    def test_get_12(self):
        """测试: 查询单个角色"""
        self.test_endpoint(
            "GET", "/permissions/roles/test-id",
            "查询单个角色",
            expect_status=200,
            require_auth=true
        )

    def test_put_13(self):
        """测试: 更新角色"""
        self.test_endpoint(
            "PUT", "/permissions/roles/test-id",
            "更新角色",
            expect_status=200,
            require_auth=true
        )

    def test_delete_14(self):
        """测试: 删除角色"""
        self.test_endpoint(
            "DELETE", "/permissions/roles/test-id",
            "删除角色",
            expect_status=200,
            require_auth=true
        )

    def test_put_15(self):
        """测试: 为角色分配权限"""
        self.test_endpoint(
            "PUT", "/permissions/roles/test-id/permissions",
            "为角色分配权限",
            expect_status=200,
            require_auth=true
        )

    def test_get_16(self):
        """测试: 获取用户的所有权限"""
        self.test_endpoint(
            "GET", "/permissions/users/test-id/permissions",
            "获取用户的所有权限",
            expect_status=200,
            require_auth=true
        )

    def test_put_17(self):
        """测试: 为用户分配角色"""
        self.test_endpoint(
            "PUT", "/permissions/users/test-id/roles",
            "为用户分配角色",
            expect_status=200,
            require_auth=true
        )

    def test_post_18(self):
        """测试: 初始化超级管理员"""
        self.test_endpoint(
            "POST", "/permissions/initialize-super-admin",
            "初始化超级管理员",
            expect_status=200,
            require_auth=true
        )


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
