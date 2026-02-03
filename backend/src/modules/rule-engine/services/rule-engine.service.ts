import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class RuleEngineService {
  constructor(private prisma: PrismaService) {}

  /**
   * 评估条件是否满足
   */
  async evaluateCondition(
    condition: any,
    data: any,
    entityType: string,
    entityId: string
  ): Promise<boolean> {
    const { field, operator, value, logic = 'AND' } = condition;

    // 获取字段值
    const fieldValue = this.getFieldValue(data, field);

    // 解析期望值
    const expectedValue = this.parseValue(value);

    // 执行比较
    const result = this.compare(fieldValue, operator, expectedValue);

    return result;
  }

  /**
   * 评估条件树(支持 AND/OR 逻辑)
   */
  async evaluateConditions(
    conditions: any[],
    data: any,
    entityType: string,
    entityId: string
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    // 简化实现:只处理单层条件
    // TODO: 实现完整的条件树评估
    for (const condition of conditions) {
      const result = await this.evaluateCondition(
        condition,
        data,
        entityType,
        entityId
      );
      if (result) {
        return true; // OR 逻辑:任一条件满足即可
      }
    }

    return false;
  }

  /**
   * 从数据对象中获取字段值
   */
  private getFieldValue(data: any, field: string): any {
    const keys = field.split('.');
    let value = data;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }

    return value;
  }

  /**
   * 解析值(JSON字符串或直接返回)
   */
  private parseValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * 比较两个值
   */
  private compare(
    fieldValue: any,
    operator: string,
    expectedValue: any
  ): boolean {
    switch (operator) {
      case '=':
      case '==':
        return fieldValue == expectedValue;
      case '!=':
      case '<>':
        return fieldValue != expectedValue;
      case '>':
        return Number(fieldValue) > Number(expectedValue);
      case '<':
        return Number(fieldValue) < Number(expectedValue);
      case '>=':
        return Number(fieldValue) >= Number(expectedValue);
      case '<=':
        return Number(fieldValue) <= Number(expectedValue);
      case 'IN':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      case 'LIKE':
        return typeof fieldValue === 'string' &&
               fieldValue.toLowerCase().includes(String(expectedValue).toLowerCase());
      case 'BETWEEN':
        if (!Array.isArray(expectedValue) || expectedValue.length !== 2) {
          return false;
        }
        const numValue = Number(fieldValue);
        return numValue >= Number(expectedValue[0]) &&
               numValue <= Number(expectedValue[1]);
      default:
        return false;
    }
  }
}
