/**
 * 阶梯定价功能测试脚本
 *
 * 使用方法:
 * 1. 启动后端服务: cd backend && pnpm dev
 * 2. 在另一个终端运行: node test-pricing.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:7890';
let token = '';

// 登录获取token
async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123',
    });
    token = response.data.access_token;
    console.log('✅ 登录成功');
    return token;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    process.exit(1);
  }
}

// 创建测试产品
async function createTestProduct() {
  try {
    const response = await axios.post(
      `${API_BASE}/products`,
      {
        name: '年代理记账服务',
        code: 'ANNUAL_SERVICE',
        description: '年度代理记账服务,支持阶梯定价',
        price: 1200,
        pricingType: 'TIER_AMOUNT',
        invoiceLimit: 200000,
        invoiceCount: 20,
        overLimitPrice: 300,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    console.log('✅ 创建产品成功:', response.data.name);
    return response.data;
  } catch (error) {
    console.error('❌ 创建产品失败:', error.response?.data || error.message);
    return null;
  }
}

// 创建按金额阶梯的定价规则
async function createAmountTierRule(productId) {
  try {
    const response = await axios.post(
      `${API_BASE}/pricing/rules`,
      {
        productId,
        name: '按金额阶梯定价',
        ruleType: 'AMOUNT_TIER',
        tiers: [
          {
            minThreshold: 0,
            maxThreshold: 200000,
            price: 1200,
            additionalPrice: 0,
            description: '0-20万:1200元',
            order: 1,
          },
          {
            minThreshold: 200000,
            maxThreshold: 500000,
            price: 1500,
            additionalPrice: 300,
            description: '20-50万:1500元(加300)',
            order: 2,
          },
          {
            minThreshold: 500000,
            price: 2000,
            additionalPrice: 800,
            description: '50万以上:2000元(加800)',
            order: 3,
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    console.log('✅ 创建金额阶梯规则成功');
    return response.data;
  } catch (error) {
    console.error('❌ 创建规则失败:', error.response?.data || error.message);
    return null;
  }
}

// 创建零申报规则
async function createZeroDeclarationRule(productId) {
  try {
    const response = await axios.post(
      `${API_BASE}/pricing/rules`,
      {
        productId,
        name: '零申报按次收费',
        ruleType: 'ZERO_DECLARATION',
        tiers: [
          {
            minThreshold: 3,
            price: 0,
            description: '免费3次',
            order: 1,
          },
          {
            minThreshold: 0,
            price: 50,
            description: '超额50元/次',
            order: 2,
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    console.log('✅ 创建零申报规则成功');
    return response.data;
  } catch (error) {
    console.error('❌ 创建规则失败:', error.response?.data || error.message);
    return null;
  }
}

// 测试价格计算
async function testCalculatePrice(contractId, invoiceAmount, invoiceCount = 0) {
  try {
    const response = await axios.post(
      `${API_BASE}/pricing/calculate`,
      {
        contractId,
        invoiceAmount,
        invoiceCount,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const result = response.data;
    console.log('\n📊 价格计算结果:');
    console.log(`  产品: ${result.productName}`);
    console.log(`  基础价格: ¥${result.basePrice}`);
    console.log(`  最终价格: ¥${result.finalPrice}`);
    console.log(`  加价金额: ¥${result.additionalPrice}`);
    console.log(`  规则类型: ${result.ruleType}`);
    console.log(`  规则名称: ${result.ruleName}`);
    if (result.matchedTier) {
      console.log(`  匹配阶梯: ${result.matchedTier.description}`);
    }

    return result;
  } catch (error) {
    console.error('❌ 价格计算失败:', error.response?.data || error.message);
    return null;
  }
}

// 查询所有定价规则
async function listAllRules() {
  try {
    const response = await axios.get(`${API_BASE}/pricing/rules`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('\n📋 所有定价规则:');
    response.data.forEach((rule, index) => {
      console.log(`\n${index + 1}. ${rule.name} (${rule.ruleType})`);
      console.log(`   产品: ${rule.product.name}`);
      rule.tiers.forEach((tier) => {
        console.log(
          `   - ${tier.description || `阶梯${tier.order}`}: ¥${tier.price}`,
        );
      });
    });
  } catch (error) {
    console.error('❌ 查询规则失败:', error.response?.data || error.message);
  }
}

// 主测试流程
async function main() {
  console.log('🚀 开始测试阶梯定价功能\n');

  // 1. 登录
  await login();

  // 2. 创建测试产品
  const product = await createTestProduct();
  if (!product) {
    console.log('⚠️  产品可能已存在,尝试使用现有产品...');
    // 这里可以添加查询现有产品的逻辑
  }

  // 3. 创建定价规则
  if (product) {
    await createAmountTierRule(product.id);
    await createZeroDeclarationRule(product.id);
  }

  // 4. 查询所有规则
  await listAllRules();

  // 5. 注意: 价格计算需要先创建合同,这里只是示例
  console.log('\n⚠️  注意: 完整的价格计算测试需要先创建客户和合同');
  console.log('可以通过创建合同后,使用合同ID测试价格计算功能');

  console.log('\n✅ 测试完成!');
}

// 运行测试
main().catch((error) => {
  console.error('测试失败:', error);
  process.exit(1);
});
