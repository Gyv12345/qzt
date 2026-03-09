import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  getIntentPrompt,
  IntentRecognitionResult,
} from "../prompts/intent-prompt";
import { getSystemPrompt } from "../prompts/system-prompt";

/**
 * 智谱 AI (GLM) Provider
 * 使用 OpenAI SDK 兼容的 API
 */
@Injectable()
export class ZhipuProvider {
  private readonly logger = new Logger(ZhipuProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("AI_API_KEY") || "";
    this.baseUrl = "https://open.bigmodel.cn/api/paas/v4";
    this.model = this.configService.get<string>("AI_MODEL") || "glm-4-flash";
  }

  /**
   * 检查是否已配置 API Key
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * 调用智谱 AI API
   */
  private async callApi(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("智谱 AI API Key 未配置");
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`智谱 AI API 调用失败: ${error}`);
        throw new Error(`API 调用失败: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    } catch (error) {
      this.logger.error(`智谱 AI API 调用异常: ${error}`);
      throw error;
    }
  }

  /**
   * 解析用户意图
   */
  async parseIntent(
    userInput: string,
    context?: string,
  ): Promise<IntentRecognitionResult> {
    const prompt = getIntentPrompt(userInput, context);
    const messages = [
      { role: "system", content: getSystemPrompt() },
      { role: "user", content: prompt },
    ];

    try {
      const response = await this.callApi(messages);

      // 尝试解析 JSON 响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as IntentRecognitionResult;
        return {
          intent: result.intent || "unknown",
          confidence: result.confidence || 0.5,
          entities: result.entities || {},
          missingFields: result.missingFields || [],
        };
      }

      // 无法解析 JSON，返回默认值
      return {
        intent: "unknown",
        confidence: 0,
        entities: {},
        missingFields: [],
      };
    } catch (error) {
      this.logger.error(`意图解析失败: ${error}`);
      return {
        intent: "unknown",
        confidence: 0,
        entities: {},
        missingFields: [],
      };
    }
  }

  /**
   * 生成回复
   */
  async generateResponse(
    userInput: string,
    context?: string,
    systemPrompt?: string,
  ): Promise<string> {
    const messages = [
      { role: "system", content: systemPrompt || getSystemPrompt() },
    ];

    if (context) {
      messages.push({ role: "system", content: `上下文: ${context}` });
    }

    messages.push({ role: "user", content: userInput });

    try {
      return await this.callApi(messages);
    } catch (error) {
      this.logger.error(`生成回复失败: ${error}`);
      return "抱歉，处理您的请求时遇到了问题，请稍后再试。";
    }
  }

  /**
   * 提取实体信息
   */
  async extractEntities(
    userInput: string,
    intent: string,
    requiredFields: string[],
  ): Promise<Record<string, unknown>> {
    const prompt = `从以下用户输入中提取实体信息。

意图: ${intent}
需要提取的字段: ${requiredFields.join(", ")}

用户输入: ${userInput}

请以 JSON 格式输出提取的实体，例如:
{"companyName": "北京科技有限公司", "contactName": "张三"}

如果某个字段无法从输入中提取，请将其值设为 null。`;

    const messages = [
      { role: "system", content: getSystemPrompt() },
      { role: "user", content: prompt },
    ];

    try {
      const response = await this.callApi(messages);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      this.logger.error(`实体提取失败: ${error}`);
      return {};
    }
  }
}
