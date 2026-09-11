import { BadGatewayException, Injectable } from '@nestjs/common';
import { Ollama } from 'ollama';
import { ProductsService } from '../products/products.service';
import { AI_ANSWER_FORMAT, LOW_STOCK_TOOL } from './constants/ai.constants';
import { AiAnswer } from './interfaces/ai-answer.interface';

@Injectable()
export class AiService {
  constructor(private readonly productsService: ProductsService) {}

  private getOllamaClient(): Ollama {
    return new Ollama({
      host: process.env.OLLAMA_HOST ?? 'http://localhost:11434',
    });
  }

  async ask(question: string): Promise<{ answer: string }> {
    const model = process.env.OLLAMA_MODEL ?? 'gemma4:12b';

    try {
      const ollama = this.getOllamaClient();
      const response = await ollama.chat({
        model,
        messages: [{ role: 'user', content: question }],
      });

      return {
        answer: response.message.content || '',
      };
    } catch {
      throw new BadGatewayException('AI service request failed');
    }
  }

  async inventoryAssistant(question: string): Promise<AiAnswer> {
    const model = process.env.OLLAMA_MODEL ?? 'gemma4:12b';

    try {
      const ollama = this.getOllamaClient();
      let response = await ollama.chat({
        model,
        messages: [{ role: 'user', content: question }],
        tools: [LOW_STOCK_TOOL],
        format: AI_ANSWER_FORMAT,
      });

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const functionCalls = response.message.tool_calls ?? [];

        if (functionCalls.length === 0) {
          break;
        }

        const toolResponses = await Promise.all(
          functionCalls.map(async (toolCall) => {
            if (toolCall.function.name !== LOW_STOCK_TOOL.function.name) {
              throw new BadGatewayException(
                `Unsupported AI function: ${toolCall.function.name}`,
              );
            }

            const argumentsObject = this.parseToolArguments(
              toolCall.function.arguments,
            );
            const products = await this.productsService.getLowStockProducts(
              argumentsObject.threshold,
            );

            return {
              role: 'tool' as const,
              tool_name: toolCall.function.name,
              content: JSON.stringify(
                products.map(({ id, name, quantity }) => ({
                  id,
                  name,
                  quantity,
                })),
              ),
            };
          }),
        );

        response = await ollama.chat({
          model,
          messages: [
            { role: 'user', content: question },
            {
              role: 'assistant',
              content: '',
              tool_calls: functionCalls,
            },
            ...toolResponses,
          ],
          tools: [LOW_STOCK_TOOL],
          format: AI_ANSWER_FORMAT,
        });
      }

      if ((response.message.tool_calls ?? []).length > 0) {
        throw new BadGatewayException('AI tool call limit exceeded');
      }

      return this.parseAiAnswer(response.message.content || '{}');
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException('AI service request failed');
    }
  }

  private parseToolArguments(argumentsValue: unknown): { threshold: number } {
    try {
      const argumentsObject =
        typeof argumentsValue === 'string'
          ? (JSON.parse(argumentsValue) as Record<string, unknown>)
          : (argumentsValue as Record<string, unknown>);

      if (
        typeof argumentsObject !== 'object' ||
        argumentsObject === null ||
        !('threshold' in argumentsObject)
      ) {
        throw new Error('Invalid tool arguments');
      }

      const { threshold } = argumentsObject;

      if (
        typeof threshold !== 'number' ||
        !Number.isFinite(threshold) ||
        threshold < 0
      ) {
        throw new Error('Invalid tool arguments');
      }

      return { threshold };
    } catch {
      throw new BadGatewayException('AI returned invalid tool arguments');
    }
  }

  private parseAiAnswer(output: string): AiAnswer {
    try {
      const answer: unknown = JSON.parse(output);

      if (
        typeof answer !== 'object' ||
        answer === null ||
        !('answer' in answer) ||
        typeof answer.answer !== 'string' ||
        !('products' in answer) ||
        !Array.isArray(answer.products)
      ) {
        throw new Error('Invalid structured response');
      }

      return answer as AiAnswer;
    } catch {
      throw new BadGatewayException(
        'AI returned an invalid structured response',
      );
    }
  }
}
