#!/usr/bin/env python3
"""
主测试运行器
运行所有模块的API测试
"""

import sys
import os
import glob
import importlib.util
from pathlib import Path


def discover_test_files(tests_dir: str) -> list:
    """发现所有测试文件"""
    # 修复：tests_dir 应该已经是包含 modules 的目录
    # 所以路径应该是 tests_dir/test_*.py 而不是 tests_dir/modules/test_*.py
    pattern = f"{tests_dir}/test_*.py"
    test_files = glob.glob(pattern)
    return sorted(test_files)


def load_test_class(filepath: str):
    """动态加载测试类"""
    module_name = Path(filepath).stem

    # 添加 tests 目录到 sys.path，以便导入 test_base
    tests_dir = os.path.dirname(os.path.abspath(__file__))
    if tests_dir not in sys.path:
        sys.path.insert(0, tests_dir)
    # 添加 utils 目录到 sys.path
    utils_dir = os.path.join(tests_dir, 'utils')
    if utils_dir not in sys.path:
        sys.path.insert(0, utils_dir)

    spec = importlib.util.spec_from_file_location(module_name, filepath)
    if spec is None or spec.loader is None:
        return None

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)

    # 查找测试类（类名以Test结尾）
    for attr_name in dir(module):
        attr = getattr(module, attr_name)
        if isinstance(attr, type) and attr_name.endswith('Test'):
            return attr

    return None


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="企账通后端API全量测试")
    parser.add_argument("--url", default="http://localhost:7890", help="后端服务URL")
    parser.add_argument("--module", help="指定测试模块（如：customer, product等）")
    parser.add_argument("--username", default="admin", help="测试用户名")
    parser.add_argument("--password", default="admin123", help="测试密码")
    parser.add_argument("--output", help="测试报告输出文件")
    parser.add_argument("--list", action="store_true", help="列出所有可用的测试模块")

    args = parser.parse_args()

    # 获取测试目录
    tests_dir = os.path.join(os.path.dirname(__file__), 'modules')

    if args.list:
        print("\n可用的测试模块:")
        print("="*60)
        test_files = discover_test_files(tests_dir)
        if not test_files:
            print("⚠️  未找到测试文件")
            print("\n💡 提示: 先运行以下命令生成测试文件:")
            print("   cd tests/utils")
            print("   python api_parser.py /tmp/qzt-api-docs.json ../modules/")
            return

        for test_file in test_files:
            module_name = Path(test_file).stem.replace('test_', '')
            print(f"  - {module_name}")
        print("="*60 + "\n")
        return

    # 检查测试文件是否存在
    test_files = discover_test_files(tests_dir)
    if not test_files:
        print("⚠️  未找到测试文件!")
        print("\n💡 提示: 请先运行以下命令生成测试文件:")
        print("   cd tests/utils")
        print("   python api_parser.py /tmp/qzt-api-docs.json ../modules/")
        print("\n或者运行:")
        print("   ./generate_tests.sh")
        return

    # 过滤测试文件
    if args.module:
        test_files = [f for f in test_files if f"test_{args.module}.py" in f]
        if not test_files:
            print(f"❌ 未找到模块 '{args.module}' 的测试文件")
            return

    print("\n" + "="*60)
    print("企账通后端API全量测试套件")
    print("="*60)
    print(f"后端URL: {args.url}")
    print(f"测试模块: {len(test_files)} 个")
    print("="*60 + "\n")

    total_passed = 0
    total_failed = 0
    all_results = []

    # 运行每个测试模块
    for test_file in test_files:
        print(f"\n📂 加载测试: {Path(test_file).name}")

        test_class = load_test_class(test_file)
        if test_class is None:
            print(f"❌ 无法加载测试类: {test_file}")
            continue

        # 创建测试实例
        test_instance = test_class(base_url=args.url)

        # 检查服务器
        if not test_instance.check_server():
            print("⚠️  后端服务未运行，跳过测试")
            continue

        # 登录
        if not test_instance.login():
            print("⚠️  登录失败，跳过需要认证的测试")
            # 即使登录失败，也尝试运行不需要认证的测试

        # 运行所有测试
        try:
            test_instance.run_all_tests()
        except Exception as e:
            print(f"❌ 测试执行出错: {str(e)}")
            continue

        # 累计结果
        total_passed += test_instance.passed
        total_failed += test_instance.failed
        all_results.extend(test_instance.test_results)

    # 打印总体摘要
    print("\n" + "="*60)
    print("总体测试摘要")
    print("="*60)
    total = total_passed + total_failed
    print(f"总计: {total} 个测试")
    print(f"✅ 通过: {total_passed}")
    print(f"❌ 失败: {total_failed}")
    if total > 0:
        print(f"通过率: {total_passed / total * 100:.1f}%")
    print("="*60 + "\n")

    # 输出测试报告
    if args.output:
        import json
        report = {
            "summary": {
                "total": total,
                "passed": total_passed,
                "failed": total_failed,
                "pass_rate": total_passed / total * 100 if total > 0 else 0
            },
            "results": all_results
        }
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"✅ 测试报告已保存到: {args.output}\n")

    # 返回退出码
    sys.exit(0 if total_failed == 0 else 1)


if __name__ == "__main__":
    main()
