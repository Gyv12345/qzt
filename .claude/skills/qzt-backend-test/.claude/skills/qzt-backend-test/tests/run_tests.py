#!/usr/bin/env python3
"""运行所有测试"""

import sys
import glob
from pathlib import Path

tests_dir = Path(__file__).parent / "modules"
test_files = sorted(tests_dir.glob("test_*.py"))

print(f"\\n找到 {len(test_files)} 个测试文件\\n")

total_passed = 0
total_failed = 0

# 先登录获取token
import requests
resp = requests.post("http://localhost:7890/auth/login", 
                     json={"username": "admin", "password": "admin123"})
token = None
if resp.status_code in [200, 201]:
    token = resp.json().get('data', {}).get('access_token')
    print("✅ 登录成功\\n")

for test_file in test_files:
    print(f"📂 运行: {test_file.name}")
    
    module_name = test_file.stem
    spec = __import__('importlib.util').util.spec_from_file_location(module_name, test_file)
    module = __import__('importlib.util').module_from_spec(spec)
    spec.loader.exec_module(module)
    
    # 找到测试类
    test_class = None
    for attr in dir(module):
        obj = getattr(module, attr)
        if isinstance(obj, type) and 'Test' in attr:
            test_class = obj
            break
    
    if test_class:
        tester = test_class()
        tester.token = token
        tester.run_all_tests()
        total_passed += tester.passed
        total_failed += tester.failed

print(f"\\n{'='*60}")
print("总体测试摘要")
print(f"{'='*60}")
total = total_passed + total_failed
print(f"总计: {total}, 通过: {total_passed}, 失败: {total_failed}")
if total > 0:
    print(f"通过率: {total_passed/total*100:.1f}%")
print(f"{'='*60}\\n")
