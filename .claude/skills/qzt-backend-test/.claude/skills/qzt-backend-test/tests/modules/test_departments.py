#!/usr/bin/env python3
"""DEPARTMENTS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class DepartmentsTest(TestBase):
    """departments 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "departments"
    
    def test_0(self):
        """创建部门"""
        self.test_endpoint("POST", "/departments", "创建部门")
    
    def test_1(self):
        """获取部门树形结构"""
        self.test_endpoint("GET", "/departments", "获取部门树形结构")
    
    def test_2(self):
        """获取部门详情"""
        self.test_endpoint("GET", "/departments/test-id", "获取部门详情")
    
    def test_3(self):
        """更新部门"""
        self.test_endpoint("PATCH", "/departments/test-id", "更新部门")
    
    def test_4(self):
        """删除部门"""
        self.test_endpoint("DELETE", "/departments/test-id", "删除部门")
    
    def test_5(self):
        """获取部门下的用户列表"""
        self.test_endpoint("GET", "/departments/test-id/users", "获取部门下的用户列表")
    
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
        self.print_summary()
