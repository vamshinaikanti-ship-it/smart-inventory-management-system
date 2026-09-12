import { BadGatewayException, Injectable } from '@nestjs/common';
import { Ollama } from 'ollama';
import { ProductsService } from '../products/products.service';
import {
  AI_ANSWER_FORMAT,
  INVENTORY_TOOLS,
  LOW_STOCK_TOOL,
} from './constants/ai.constants';
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
      const messages: any[] = [{ role: 'user', content: question }];

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await ollama.chat({
          model,
          messages,
          tools: INVENTORY_TOOLS,
          format: AI_ANSWER_FORMAT,
        });

        messages.push(response.message);

        const toolCalls = response.message.tool_calls ?? [];

        if (toolCalls.length === 0) {
          return this.parseAiAnswer(response.message.content || '{}');
        }

        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;

          switch (toolName) {
            case LOW_STOCK_TOOL.function.name: {
              const { threshold } = this.parseToolArguments(
                toolCall.function.arguments,
              );

              const products =
                await this.productsService.getLowStockProducts(threshold);

              messages.push({
                role: 'tool',
                tool_name: toolName,
                content: JSON.stringify(
                  products.map(({ id, name, quantity }) => ({
                    id,
                    name,
                    quantity,
                  })),
                ),
              });
              break;
            }

            case 'search_products': {
              const { query, limit } = this.parseSearchProductsArguments(
                toolCall.function.arguments,
              );

              const products = await this.productsService.searchByName(
                query,
                limit,
              );

              messages.push({
                role: 'tool',
                tool_name: toolName,
                content: JSON.stringify(
                  products.map(({ id, name, quantity }) => ({
                    id,
                    name,
                    quantity,
                  })),
                ),
              });
              break;
            }

            case 'get_product_by_id': {
              const { id } = this.parseProductIdArguments(
                toolCall.function.arguments,
              );

              const product = await this.productsService.findById(id);

              messages.push({
                role: 'tool',
                tool_name: toolName,
                content: JSON.stringify({
                  id: product.id,
                  name: product.name,
                  quantity: product.quantity,
                }),
              });
              break;
            }

            case 'get_total_inventory': {
              const total = await this.productsService.getTotalInventory();

              messages.push({
                role: 'tool',
                tool_name: toolName,
                content: JSON.stringify({ total }),
              });
              break;
            }

            case 'get_inventory_value': {
              const value = await this.productsService.getInventoryValue();

              messages.push({
                role: 'tool',
                tool_name: toolName,
                content: JSON.stringify({ value }),
              });
              break;
            }

            case 'get_products_by_category': {
              const { category_id } = this.parseCategoryIdArguments(
                toolCall.function.arguments,
              );

              const products =
                await this.productsService.getProductsByCategory(category_id);

              messages.push({
                role: 'tool',
                tool_name: toolName,
                content: JSON.stringify(
                  products.map(({ id, name, quantity }) => ({
                    id,
                    name,
                    quantity,
                  })),
                ),
              });
              break;
            }

            case 'get_out_of_stock_products': {
              const products =
                await this.productsService.getOutOfStockProducts();

              messages.push({
                role: 'tool',
                tool_name: toolName,
                content: JSON.stringify(
                  products.map(({ id, name, quantity }) => ({
                    id,
                    name,
                    quantity,
                  })),
                ),
              });
              break;
            }

            default:
              throw new BadGatewayException(
                `Unsupported AI function: ${toolName}`,
              );
          }
        }
      }

      throw new BadGatewayException('AI tool call limit exceeded');
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

  private parseSearchProductsArguments(argumentsValue: unknown): {
    query: string;
    limit: number;
  } {
    try {
      const argumentsObject =
        typeof argumentsValue === 'string'
          ? (JSON.parse(argumentsValue) as Record<string, unknown>)
          : (argumentsValue as Record<string, unknown>);

      if (
        typeof argumentsObject !== 'object' ||
        argumentsObject === null ||
        !('query' in argumentsObject)
      ) {
        throw new Error('Invalid tool arguments');
      }

      const { query, limit } = argumentsObject;

      if (typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Invalid tool arguments');
      }

      const normalizedLimit =
        typeof limit === 'number' && Number.isFinite(limit) && limit > 0
          ? Math.min(Math.trunc(limit), 20)
          : 10;

      return { query: query.trim(), limit: normalizedLimit };
    } catch {
      throw new BadGatewayException('AI returned invalid tool arguments');
    }
  }

  private parseProductIdArguments(argumentsValue: unknown): { id: number } {
    try {
      const argumentsObject =
        typeof argumentsValue === 'string'
          ? (JSON.parse(argumentsValue) as Record<string, unknown>)
          : (argumentsValue as Record<string, unknown>);

      if (
        typeof argumentsObject !== 'object' ||
        argumentsObject === null ||
        !('id' in argumentsObject)
      ) {
        throw new Error('Invalid tool arguments');
      }

      const { id } = argumentsObject;

      if (typeof id !== 'number' || !Number.isFinite(id) || id <= 0) {
        throw new Error('Invalid tool arguments');
      }

      return { id };
    } catch {
      throw new BadGatewayException('AI returned invalid tool arguments');
    }
  }

  private parseCategoryIdArguments(argumentsValue: unknown): {
    category_id: number;
  } {
    try {
      const argumentsObject =
        typeof argumentsValue === 'string'
          ? (JSON.parse(argumentsValue) as Record<string, unknown>)
          : (argumentsValue as Record<string, unknown>);

      if (
        typeof argumentsObject !== 'object' ||
        argumentsObject === null ||
        !('category_id' in argumentsObject)
      ) {
        throw new Error('Invalid tool arguments');
      }

      const { category_id } = argumentsObject;

      if (
        typeof category_id !== 'number' ||
        !Number.isFinite(category_id) ||
        category_id <= 0
      ) {
        throw new Error('Invalid tool arguments');
      }

      return { category_id };
    } catch {
      throw new BadGatewayException('AI returned invalid tool arguments');
    }
  }

  private extractJsonCandidate(output: string): string {
    const trimmed = output.trim();

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      return fencedMatch[1].trim();
    }

    return trimmed;
  }

  private parseAiAnswer(output: string): AiAnswer {
    const rawOutput = output.trim();
    const jsonCandidate = this.extractJsonCandidate(rawOutput);

    try {
      const answer: unknown = JSON.parse(jsonCandidate);

      if (typeof answer !== 'object' || answer === null) {
        throw new Error('Invalid structured response');
      }

      const record = answer as Record<string, unknown>;

      if (
        !('answer' in record) ||
        typeof record.answer !== 'string' ||
        !('products' in record) ||
        !Array.isArray(record.products)
      ) {
        throw new Error('Invalid structured response');
      }

      const products = record.products
        .filter(
          (product): product is Record<string, unknown> =>
            typeof product === 'object' && product !== null,
        )
        .map((product) => ({
          id: typeof product.id === 'number' ? product.id : 0,
          name: typeof product.name === 'string' ? product.name : '',
          quantity: typeof product.quantity === 'number' ? product.quantity : 0,
        }))
        .filter(
          (product) =>
            Number.isFinite(product.id) &&
            product.name.trim().length > 0 &&
            Number.isFinite(product.quantity),
        );

      return {
        answer: record.answer,
        products,
      };
    } catch {
      return {
        answer: rawOutput || 'I could not generate a structured response.',
        products: [],
      };
    }
  }
}
