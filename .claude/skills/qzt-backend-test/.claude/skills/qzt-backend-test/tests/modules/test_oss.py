#!/usr/bin/env python3
"""OSS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class OssTest(TestBase):
    """oss 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "oss"
    
    def test_0(self):
        """上传文件"""
        self.test_endpoint("POST", "/oss/upload", "上传文件")
    
    def test_1(self):
        """获取上传授权 URL（前端直传）"""
        self.test_endpoint("POST", "/oss/upload-url", "获取上传授权 URL（前端直传）")
    
    def test_2(self):
        """分页查询文件列表"""
        self.test_endpoint("GET", "/oss/files", "分页查询文件列表")
    
    def test_3(self):
        """获取存储空间使用统计"""
        self.test_endpoint("GET", "/oss/usage", "获取存储空间使用统计")
    
    def test_4(self):
        """获取文件详情"""
        self.test_endpoint("GET", "/oss/files/test-id", "获取文件详情")
    
    def test_5(self):
        """删除文件"""
        self.test_endpoint("DELETE", "/oss/files/test-id", "删除文件")
    
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
