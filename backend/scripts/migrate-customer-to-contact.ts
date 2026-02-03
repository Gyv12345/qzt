/**
 * 数据迁移脚本：将旧 Customer 数据迁移到新结构
 *
 * 旧 Customer 结构：
 * - id, name (客户名称)
 * - contactName, contactPhone, contactEmail (联系人信息)
 * - companyName (公司名称，可选)
 * - address, customerLevel, sourceChannel, followUserId, tags, remark
 *
 * 新结构：
 * - Customer (公司)：id, name(公司名), shortName, address, customerLevel, ...
 * - Contact (联系人)：id, name(姓名), phone, email, ...
 * - CustomerContact (关联)：customerId, contactId, isPrimary, ...
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OldCustomer {
  id: string;
  name: string; // 客户名称（可能是公司名也可能是人名）
  contactName: string; // 联系人姓名
  contactPhone: string; // 联系电话
  contactEmail?: string; // 联系邮箱
  companyName?: string; // 公司名称（可选）
  address?: string;
  customerLevel: number;
  sourceChannel?: number;
  followUserId?: string;
  tags?: string;
  remark?: string;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

async function migrate() {
  console.log('开始数据迁移...');

  try {
    // 1. 检查是否已经迁移过
    const contactCount = await prisma.contact.count();
    if (contactCount > 0) {
      console.log(`⚠️  Contact 表已有 ${contactCount} 条数据，请确认是否需要清理后再迁移`);
      const answer = await prompt('是否继续迁移？(yes/no): ');
      if (answer.toLowerCase() !== 'yes') {
        console.log('迁移已取消');
        return;
      }
    }

    // 2. 检查旧 Customer 表结构（看是否包含 contactName 字段）
    const sampleCustomer = await prisma.customer.findFirst() as OldCustomer | null;
    if (!sampleCustomer) {
      console.log('✅ Customer 表为空，无需迁移');
      return;
    }

    // 检查是否已经是新结构（没有 contactName 字段）
    if (!('contactName' in sampleCustomer)) {
      console.log('✅ Customer 表已经是新结构，无需迁移');
      return;
    }

    // 3. 获取所有旧客户数据
    const oldCustomers = await prisma.customer.findMany() as OldCustomer[];
    console.log(`📊 找到 ${oldCustomers.length} 条旧客户数据`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // 4. 逐条迁移
    for (const oldCustomer of oldCustomers) {
      try {
        await prisma.$transaction(async (tx) => {
          // 确定公司名称：优先使用 companyName，其次使用 name
          const companyName = oldCustomer.companyName || oldCustomer.name;
          const customerName = oldCustomer.name;

          // 创建 Contact
          const contact = await tx.contact.create({
            data: {
              name: oldCustomer.contactName,
              phone: oldCustomer.contactPhone,
              email: oldCustomer.contactEmail,
              status: oldCustomer.status,
              createdAt: oldCustomer.createdAt,
              updatedAt: oldCustomer.updatedAt,
            },
          });

          // 更新 Customer（保留原 ID）
          await tx.customer.update({
            where: { id: oldCustomer.id },
            data: {
              name: companyName,
              // 移除旧字段（Prisma 会自动忽略不存在的字段）
              // contactName, contactPhone, contactEmail, companyName 将被移除
            },
          });

          // 创建关联
          await tx.customerContact.create({
            data: {
              customerId: oldCustomer.id,
              contactId: contact.id,
              isPrimary: true, // 迁移的数据默认为主要联系人
              status: 1,
              createdAt: oldCustomer.createdAt,
            },
          });

          successCount++;
          console.log(`✅ 迁移成功: ${customerName} - ${oldCustomer.contactName}`);
        });
      } catch (error) {
        errorCount++;
        const errorMsg = `❌ 迁移失败: ${oldCustomer.name} - ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // 5. 输出迁移结果
    console.log('\n========== 迁移结果 ==========');
    console.log(`总条数: ${oldCustomers.length}`);
    console.log(`成功: ${successCount}`);
    console.log(`失败: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n错误详情:');
      errors.forEach(e => console.log(e));
    }

    console.log('\n========== 验证建议 ==========');
    console.log('1. 检查 Contact 表数量: SELECT COUNT(*) FROM contacts;');
    console.log('2. 检查 CustomerContact 表数量: SELECT COUNT(*) FROM customer_contacts;');
    console.log('3. 检查 Customer 表数据是否正常: SELECT * FROM customers LIMIT 10;');
    console.log('4. 验证 API 是否正常工作');

  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 回滚脚本
 */
async function rollback() {
  console.log('开始回滚数据迁移...');

  try {
    // 删除所有关联
    const deletedContacts = await prisma.customerContact.deleteMany({});
    console.log(`🗑️  删除了 ${deletedContacts.count} 条 CustomerContact 记录`);

    // 删除所有联系人
    const deleted = await prisma.contact.deleteMany({});
    console.log(`🗑️  删除了 ${deleted.count} 条 Contact 记录`);

    console.log('✅ 回滚完成');
    console.log('⚠️  注意：Customer 表中的旧字段数据无法恢复，请从备份中恢复');

  } catch (error) {
    console.error('回滚过程中发生错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 简单的命令行交互
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer);
    });
  });
}

// 命令行参数处理
const command = process.argv[2];

if (command === 'rollback') {
  rollback();
} else if (command === 'migrate' || !command) {
  migrate();
} else {
  console.log('用法:');
  console.log('  ts-node migrate-customer-to-contact.ts migrate  # 执行迁移');
  console.log('  ts-node migrate-customer-to-contact.ts rollback  # 回滚迁移');
}
