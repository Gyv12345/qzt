#!/usr/bin/env python3
"""测试基类"""

import requests
from typing import Dict, List, Any, Optional, Tuple

class TestBase:
    def __init__(self, base_url="http://localhost:7890"):
        self.base_url = base_url
        self.token = None
        self.passed = 0
        self.failed = 0
        self.module = "test"
    
    def log(self, msg, status="INFO"):
        icons = {"PASS": "✅", "FAIL": "❌", "INFO": "ℹ️", "WARN": "⚠️", "START": "🚀"}
        print(f"{icons.get(status, '•')} {msg}")
        if status in ["PASS", "FAIL"]:
            if status == "PASS":
                self.passed += 1
            else:
                self.failed += 1
    
    def test_endpoint(self, method, path, desc, **kwargs):
        """测试API端点"""
        self.log(f"测试: {desc}", "START")
        
        headers = {}
        if self.token and not path.startswith("/auth"):
            headers["Authorization"] = f"Bearer {self.token}"
        
        try:
            resp = requests.request(method, f"{self.base_url}{path}", 
                                    headers=headers, timeout=10)
            if resp.status_code == kwargs.get('expect_status', 200):
                self.log(f"{desc} - 成功", "PASS")
            else:
                self.log(f"{desc} - 失败: {resp.status_code}", "FAIL")
        except Exception as e:
            self.log(f"{desc} - 异常: {e}", "FAIL")
    
    def print_summary(self):
        """打印摘要"""
        total = self.passed + self.failed
        print(f"\\n{'='*60}")
        print(f"{self.module.upper()} 测试摘要")
        print(f"{'='*60}")
        print(f"总计: {total}, 通过: {self.passed}, 失败: {self.failed}")
        if total > 0:
            print(f"通过率: {self.passed/total*100:.1f}%")
        print(f"{'='*60}\\n")
