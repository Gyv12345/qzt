#!/usr/bin/env python3
"""API文档解析工具 - 简化版"""
import json
import sys
from pathlib import Path

def generate_tests():
    """生成测试文件"""
    api_doc_path = "/tmp/qzt-api-docs.json"
    output_dir = Path(__file__).parent.parent / "modules"
    
    with open(api_doc_path, 'r') as f:
        api_doc = json.load(f)
    
    paths = api_doc.get('paths', {})
    
    # 按模块分组
    modules = {}
    for path, methods in paths.items():
        module = path.split('/')[1].replace('-', '_')
        if module not in modules:
            modules[module] = []
        
        for method, details in methods.items():
            if method.lower() in ['get', 'post', 'put', 'patch', 'delete']:
                modules[module].append({
                    'path': path,
                    'method': method.upper(),
                    'summary': details.get('summary', f'{method.upper()} {path}')
                })
    
    # 为每个模块生成测试文件
    for module, endpoints in modules.items():
        filename = output_dir / f"test_{module}.py"
        
        code = f'''#!/usr/bin/env python3
"""{module.upper()} 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class {module.title().replace('_', '')}Test(TestBase):
    """{module} 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "{module}"
    
'''
        
        for i, ep in enumerate(endpoints[:10]):  # 限制每个模块最多10个测试
            path = ep['path'].replace('{id}', 'test-id')
            method = ep['method']
            summary = ep['summary']
            
            code += f'''    def test_{i}(self):
        """{summary}"""
        self.test_endpoint("{method}", "{path}", "{summary}")
    
'''
        
        code += '''    def run_all_tests(self):
        """运行所有测试"""
        print(f"\\\\n{'='*60}")
        print(f"{self.module.upper()} 模块测试")
        print(f"{'='*60}\\\\n")
'''
        
        for i in range(len(endpoints[:10])):
            code += f'        self.test_{i}()\n'
        
        code += '''        self.print_summary()
'''
        
        with open(filename, 'w') as f:
            f.write(code)
        
        print(f"✅ 生成: test_{module}.py ({len(endpoints)} 个端点)")

if __name__ == "__main__":
    generate_tests()
