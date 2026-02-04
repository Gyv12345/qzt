# 企账通后端测试框架 - 使用说明

## 概述

本测试框架基于 Swagger API 文档自动生成测试代码和测试数据，实现了测试的自动化和可维护性。

## 目录结构

```
tests/
├── utils/
│   ├── api_parser.py              # Swagger 解析器和测试代码生成器
│   ├── test_data_generator.py     # 测试数据生成器
│   └── test_base.py               # 测试基类
├── modules/
│   └── test_*.py                  # 自动生成的测试代码
├── data/
│   └── test_*_data.json           # 自动生成的测试数据
├── run_all_tests.py               # 测试运行器
└── generate_tests.sh              # 测试生成脚本
```

## 快速开始

### 1. 生成测试文件和数据

```bash
cd tests/utils
python3 api_parser.py /tmp/qzt-api-docs.json ../modules/
```

输出：
- `modules/test_*.py` - 测试代码
- `data/test_*_data.json` - 测试数据

### 2. 运行所有测试

```bash
cd tests
python3 run_all_tests.py
```

### 3. 运行指定模块测试

```bash
cd tests
python3 run_all_tests.py --module customer
```

### 4. 列出所有可用模块

```bash
cd tests
python3 run_all_tests.py --list
```

## 工作原理

### 测试生成流程

```
Swagger API 文档
    ↓
api_parser.py (解析 API)
    ↓
test_data_generator.py (生成测试数据)
    ↓
├─ test_*.py (测试代码)
└─ test_*_data.json (测试数据)
```

### 测试数据生成策略

1. **从 Swagger 提取 Schema**
   - 解析 `components/schemas` 中的 DTO 定义
   - 提取字段类型、描述、示例值

2. **智能数据生成**
   - 根据字段类型生成合适的数据（string/number/boolean）
   - 根据字段描述识别语义（姓名/电话/地址/公司等）
   - 优先使用 Swagger 中的 `example` 值

3. **必填字段处理**
   - 优先生成 `required` 字段
   - 确保测试数据完整有效

### 示例

#### 测试数据 (data/test_customer_data.json)

```json
{
  "post_5": {
    "method": "POST",
    "path": "/customers",
    "summary": "创建客户",
    "request_body": {
      "name": "测试北京科技有限公司",
      "code": "TEST001",
      "industry": "互联网",
      "scale": "11-50人",
      "address": "北京市朝阳区测试路123号",
      "customerLevel": 1
    }
  }
}
```

#### 测试代码 (modules/test_customer.py)

```python
def test_post_5(self):
    """测试: 创建客户"""
    data = self.get_test_data("post_5")
    if data and data.get("request_body"):
        self.test_endpoint(
            "POST", "/customers",
            "创建客户",
            data=data.get("request_body", {}),
            expect_status=201,
            require_auth=True
        )
    else:
        self.log("⚠️  跳过测试: 创建客户 (缺少测试数据)", "WARN")
```

## 测试结果示例

```bash
============================================================
CUSTOMER 模块测试摘要
============================================================
总计: 16 个测试
✅ 通过: 4
❌ 失败: 12
通过率: 25.0%
============================================================
```

## 当前状态

### 已实现 ✅

1. **自动化测试生成**
   - 从 Swagger 自动解析 API 端点
   - 自动生成测试代码框架
   - 自动生成测试数据

2. **智能数据生成**
   - 类型推断（string/number/boolean/object/array）
   - 语义识别（姓名/电话/地址/公司等）
   - 支持 Swagger example 值

3. **测试执行**
   - Token 认证自动管理
   - 统一的测试基类
   - 详细的测试报告

4. **测试数据管理**
   - 测试代码和数据分离
   - JSON 格式存储
   - 模块化管理

### 已知限制 ⚠️

1. **路径参数硬编码**
   - 所有路径参数使用 `test-id`
   - 需要手动替换为真实 ID
   - 导致部分测试返回 404

2. **测试数据质量**
   - 部分字段生成数据不够精确
   - 复杂关系数据未完善
   - 需要根据实际情况优化

3. **测试通过率**
   - 当前通过率约 25-40%
   - 主要失败原因：404（路径参数）、400（数据格式）
   - 需要进一步完善数据生成逻辑

## 优化方向

### 短期优化

1. **路径参数管理**
   ```python
   # 自动保存创建的资源 ID
   def save_resource_id(self, resource_type: str, resource_id: str):
       """保存创建的资源 ID"""
       if resource_type not in self.created_resource_ids:
           self.created_resource_ids[resource_type] = []
       self.created_resource_ids[resource_type].append(resource_id)
   ```

2. **数据清理**
   ```python
   def cleanup_resources(self):
       """清理测试创建的资源"""
       for resource_type, ids in self.created_resource_ids.items():
           for resource_id in ids:
               # 调用删除接口
               pass
   ```

3. **数据模板**
   - 支持自定义测试数据模板
   - 允许手动编辑 JSON 数据文件
   - 生成时保留手动修改

### 长期优化

1. **依赖管理**
   - 自动识别测试依赖关系
   - 按依赖顺序执行测试
   - 支持测试套件配置

2. **数据变体**
   - 为同一接口生成多组测试数据
   - 测试边界条件和异常情况
   - 参数化测试

3. **断言增强**
   - 验证响应数据结构
   - 验证业务逻辑
   - 自定义断言规则

## 维护指南

### 更新测试

当 API 发生变更时：

```bash
# 1. 重新生成测试
cd tests/utils
python3 api_parser.py /tmp/qzt-api-docs.json ../modules/

# 2. 运行测试验证
cd ..
python3 run_all_tests.py

# 3. 根据需要调整测试数据
vim data/test_*_data.json
```

### 添加自定义测试

在生成的测试文件中添加自定义方法：

```python
def test_custom_scenario(self):
    """测试自定义场景"""
    # 使用自定义数据
    custom_data = {
        "name": "测试客户",
        "code": "CUSTOM001"
    }

    success, response = self.test_endpoint(
        "POST", "/customers",
        "创建自定义客户",
        data=custom_data,
        expect_status=201,
        require_auth=True,
        return_response=True
    )

    if success and response:
        # 验证响应
        assert response['data']['name'] == "测试客户"
        # 保存 ID 供后续测试使用
        self.save_resource_id('customer', response['data']['id'])
```

## 技术栈

- **Python 3.13+**
- **requests** - HTTP 客户端
- **Swagger/OpenAPI** - API 文档

## 相关文档

- [测试数据补充方案](./TEST_DATA_STRATEGY.md)
- [API 端点列表](./references/api-endpoints.md)
- [Token 认证机制](./references/token-auth-example.md)

## 总结

本测试框架实现了：

✅ **自动化** - 基于 Swagger 完全自动生成测试
✅ **可维护** - API 变更后重新生成即可
✅ **真实数据** - 生成的数据符合业务语义
✅ **可扩展** - 支持自定义测试和数据优化

虽然当前通过率还不高，但测试框架的基础已经完善，可以：
- 快速发现 API 变更问题
- 验证基本功能可用性
- 为后续优化提供基础

通过持续优化数据生成逻辑和添加自定义测试，可以逐步提高测试覆盖率和通过率。
