import { BadGatewayException, Inject, Injectable } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { Ollama } from 'ollama';
import {
  AI_ANSWER_FORMAT,
  AI_TOOL_EXECUTOR_TOKEN,
  INVENTORY_TOOLS,
} from './constants/ai.constants';
import { AgentExecutionMetrics, AgentLogger } from './ai.logger';
import { AiAnswer } from './interfaces/ai-answer.interface';
import type { AiToolExecutorPort } from './interfaces/ai-tool.interface';

@Injectable()
export class AiService {
  constructor(
    private readonly agentLogger: AgentLogger,
    @Inject(AI_TOOL_EXECUTOR_TOKEN)
    private readonly toolExecutor: AiToolExecutorPort,
  ) {}

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
    const executionId = this.agentLogger.generateExecutionId();
    const startedAt = performance.now();
    const metrics: AgentExecutionMetrics = {
      executionId,
      aiCalls: 0,
      toolCalls: 0,
      status: 'success',
    };

    this.agentLogger.logExecutionStarted(executionId);

    try {
      const model = process.env.OLLAMA_MODEL ?? 'gemma4:12b';
      const ollama = this.getOllamaClient();
      const messages: Array<{
        role: string;
        content: string;
        tool_name?: string;
        tool_calls?: Array<{
          function: {
            name: string;
            arguments: Record<string, unknown>;
          };
        }>;
      }> = [{ role: 'user', content: question }];

      for (let attempt = 0; attempt < 3; attempt += 1) {
        metrics.aiCalls += 1;
        const callNumber = metrics.aiCalls;

        this.agentLogger.logAiRequest({
          executionId,
          callNumber,
          model,
          messageCount: messages.length,
          toolCount: INVENTORY_TOOLS.length,
        });

        const aiRequestStartedAt = performance.now();
        const response = (await ollama.chat({
          model,
          messages: messages.map((message) => ({
            role: message.role,
            content: message.content,
            tool_name: message.tool_name,
            tool_calls: message.tool_calls?.map((toolCall) => {
              const argumentsValue =
                typeof toolCall.function.arguments === 'string'
                  ? (JSON.parse(toolCall.function.arguments) as Record<
                      string,
                      unknown
                    >)
                  : toolCall.function.arguments;

              return {
                ...toolCall,
                function: {
                  ...toolCall.function,
                  arguments: argumentsValue,
                },
              };
            }),
          })),
          tools: INVENTORY_TOOLS,
          format: AI_ANSWER_FORMAT,
        })) as {
          message: {
            role: string;
            content?: string;
            tool_calls?: Array<{
              function: {
                name: string;
                arguments: Record<string, unknown>;
              };
            }>;
          };
        };
        const aiResponseDurationMs = performance.now() - aiRequestStartedAt;

        const toolCalls = response.message.tool_calls ?? [];

        this.agentLogger.logAiResponse({
          executionId,
          callNumber,
          toolCallRequested: toolCalls.length > 0,
          toolCallCount: toolCalls.length,
          responseDurationMs: aiResponseDurationMs,
        });

        messages.push({
          role: response.message.role ?? 'assistant',
          content: response.message.content ?? '',
          tool_name: undefined,
          tool_calls: response.message.tool_calls?.map((toolCall) => ({
            function: {
              name: toolCall.function.name,
              arguments: toolCall.function.arguments,
            },
          })),
        });

        if (toolCalls.length === 0) {
          const finalResult = this.parseAiAnswer(
            response.message.content || '{}',
          );
          const durationMs = performance.now() - startedAt;
          metrics.durationMs = durationMs;

          this.agentLogger.logFinalResponse({
            executionId,
            durationMs,
            aiCalls: metrics.aiCalls,
            toolCalls: metrics.toolCalls,
            status: 'success',
          });
          this.agentLogger.logExecutionCompleted({
            ...metrics,
            durationMs,
            status: 'success',
          });

          return finalResult;
        }

        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          metrics.toolCalls += 1;

          this.agentLogger.logToolCall({
            executionId,
            tool: toolName,
            arguments: toolCall.function.arguments,
          });

          const toolStartedAt = performance.now();

          try {
            const toolResult = await this.toolExecutor.execute(
              toolName,
              toolCall.function.arguments,
            );

            messages.push({
              role: 'tool',
              tool_name: toolName,
              content: toolResult.content,
            });

            this.agentLogger.logToolResult({
              executionId,
              tool: toolName,
              durationMs: performance.now() - toolStartedAt,
              resultCount: toolResult?.resultCount,
              status: 'success',
            });
          } catch (error) {
            const toolError =
              error instanceof Error ? error : new Error(String(error));
            this.agentLogger.logError(
              {
                executionId,
                operation: 'toolExecution',
                tool: toolName,
                errorMessage: toolError.message,
                durationMs: performance.now() - toolStartedAt,
                status: 'failure',
              },
              toolError,
            );
            throw error;
          }
        }
      }

      throw new BadGatewayException('AI tool call limit exceeded');
    } catch (error) {
      const durationMs = performance.now() - startedAt;
      metrics.durationMs = durationMs;
      metrics.status = 'failure';

      const message =
        error instanceof Error ? error.message : 'Unknown AI service error';

      this.agentLogger.logError(
        {
          executionId,
          operation: 'inventoryAssistant',
          errorMessage: message,
          durationMs,
          status: 'failure',
        },
        error instanceof Error ? error : undefined,
      );
      this.agentLogger.logExecutionCompleted({
        ...metrics,
        durationMs,
        status: 'failure',
      });

      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException('AI service request failed');
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
