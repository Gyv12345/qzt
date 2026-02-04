#!/usr/bin/env python3
"""PERMISSIONS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class PermissionsTest(TestBase):
    """permissions 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "permissions"
    
    def test_0(self):
        """同步前端路由到菜单"""
        self.test_endpoint("POST", "/permissions/sync-menus", "同步前端路由到菜单")
    
    def test_1(self):
        """获取菜单树"""
        self.test_endpoint("GET", "/permissions/menus", "获取菜单树")
    
    def test_2(self):
        """获取菜单详情"""
        self.test_endpoint("GET", "/permissions/menus/test-id", "获取菜单详情")
    
    def test_3(self):
        """更新菜单"""
        self.test_endpoint("PUT", "/permissions/menus/test-id", "更新菜单")
    
    def test_4(self):
        """删除菜单"""
        self.test_endpoint("DELETE", "/permissions/menus/test-id", "删除菜单")
    
    def test_5(self):
        """创建权限"""
        self.test_endpoint("POST", "/permissions/permissions", "创建权限")
    
    def test_6(self):
        """查询所有权限"""
        self.test_endpoint("GET", "/permissions/permissions", "查询所有权限")
    
    def test_7(self):
        """获取权限详情"""
        self.test_endpoint("GET", "/permissions/permissions/test-id", "获取权限详情")
    
    def test_8(self):
        """更新权限"""
        self.test_endpoint("PUT", "/permissions/permissions/test-id", "更新权限")
    
    def test_9(self):
        """删除权限"""
        self.test_endpoint("DELETE", "/permissions/permissions/test-id", "删除权限")
    
    def run_all_tests(self):
        """运行所有测试"""
        print(f"\\n{'='*60}")
        print(f"{self.module.upper()} 模块测试")
        print(f"{'='*60}\\n")
        self.test_0()
        self.test_1()
        self.test_2()
        self.test_3()
        self.test_4()
        self.test_5()
        self.test_6()
        self.test_7()
        self.test_8()
        self.test_9()
        self.print_summary()
