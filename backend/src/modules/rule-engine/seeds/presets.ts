/**
 * 预置规则模板
 *
 * 这些是系统启动时可以创建的预置规则
 */

export const PRESET_RULES = [
  {
    name: '新客户跟进提醒',
    code: 'NEW_CUSTOMER_FOLLOWUP',
    type: 'DATA_ADD',
    entityType: 'Customer',
    enabled: true,
    description: '当新客户创建后,自动创建跟进提醒任务',
    conditions: [
      {
        field: 'customerLevel',
        operator: '=',
        value: '0', // 潜在客户
        logic: 'AND',
      },
    ],
    workflows: [
      {
        actionType: 'RECORD_ADD',
        config: {
          model: 'FollowRecord',
          data: {
            type: 5, // 其他
            content: '新客户创建,请及时跟进',
            nextTime: null, // 立即跟进
          },
        },
        order: 1,
        enabled: true,
      },
    ],
  },
  {
    name: '客户等级提升',
    code: 'CUSTOMER_LEVEL_UPGRADE',
    type: 'DATA_UPDATE',
    entityType: 'Customer',
    enabled: true,
    description: '当客户从潜在客户变为正式客户时,自动记录跟进',
    conditions: [
      {
        field: 'customerLevel',
        operator: '=',
        value: '2', // 正式客户
        logic: 'AND',
      },
    ],
    workflows: [
      {
        actionType: 'RECORD_ADD',
        config: {
          model: 'FollowRecord',
          data: {
            type: 5,
            content: '客户已转为正式客户,请开始提供正式服务',
          },
        },
        order: 1,
        enabled: true,
      },
    ],
  },
  {
    name: '合同收款完成通知',
    code: 'CONTRACT_PAID_FULL',
    type: 'DATA_UPDATE',
    entityType: 'Contract',
    enabled: true,
    description: '当合同完全收款后,通知相关人员',
    conditions: [
      {
        field: 'status',
        operator: '=',
        value: '2', // 已收全
        logic: 'AND',
      },
    ],
    workflows: [
      {
        actionType: 'RECORD_ADD',
        config: {
          model: 'FollowRecord',
          data: {
            type: 5,
            content: '合同已收款完成,请开始服务',
          },
        },
        order: 1,
        enabled: true,
      },
    ],
  },
  {
    name: '开票超额预警',
    code: 'INVOICE_OVERLIMIT',
    type: 'DATA_ADD',
    entityType: 'Invoice',
    enabled: true,
    description: '当开票超额时,自动创建预警',
    conditions: [
      {
        field: 'isOverLimit',
        operator: '=',
        value: 'true',
        logic: 'AND',
      },
    ],
    workflows: [
      {
        actionType: 'RECORD_ADD',
        config: {
          model: 'FollowRecord',
          data: {
            type: 5,
            content: '客户开票已超额,请及时跟进处理',
          },
        },
        order: 1,
        enabled: true,
      },
    ],
  },
];

/**
 * 创建预置规则的种子数据
 */
export async function seedPresetRules(prisma: any) {
  for (const rule of PRESET_RULES) {
    const existing = await prisma.trigger.findUnique({
      where: { code: rule.code },
    });

    if (!existing) {
      await prisma.trigger.create({
        data: {
          ...rule,
          conditions: {
            create: rule.conditions,
          },
          workflows: {
            create: rule.workflows,
          },
        },
      });
      console.log(`✅ Created preset rule: ${rule.name}`);
    }
  }
}
