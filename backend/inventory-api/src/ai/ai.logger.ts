import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export interface AgentExecutionMetrics {
  executionId: string;
  aiCalls: number;
  toolCalls: number;
  durationMs?: number;
  status: 'success' | 'failure';
}

export interface AiRequestLogData {
  executionId: string;
  callNumber: number;
  model: string;
  messageCount: number;
  toolCount: number;
}

export interface AiResponseLogData {
  executionId: string;
  callNumber: number;
  toolCallRequested: boolean;
  toolCallCount: number;
  responseDurationMs: number;
}

export interface ToolCallLogData {
  executionId: string;
  tool: string;
  arguments: unknown;
}

export interface ToolResultLogData {
  executionId: string;
  tool: string;
  durationMs: number;
  resultCount?: number;
  status: 'success' | 'failure';
}

export interface FinalResponseLogData {
  executionId: string;
  durationMs: number;
  aiCalls: number;
  toolCalls: number;
  status: 'success' | 'failure';
}

export interface AgentErrorLogData {
  executionId: string;
  operation: string;
  tool?: string;
  errorMessage?: string;
  durationMs?: number;
  status: 'success' | 'failure';
}

export class AgentLogger {
  private readonly logger = new Logger(AgentLogger.name);

  generateExecutionId(): string {
    return `agent-${randomUUID().slice(0, 8)}`;
  }

  sanitizeArguments(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.slice(0, 10).map((item) => this.sanitizeArguments(item));
    }

    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized.length > 200
        ? `${normalized.slice(0, 197)}...`
        : normalized;
    }

    if (typeof value === 'object' && value !== null) {
      const objectValue = value as Record<string, unknown>;
      const sanitized: Record<string, unknown> = {};

      for (const [key, entry] of Object.entries(objectValue)) {
        sanitized[key] = this.sanitizeArguments(entry);
      }

      return sanitized;
    }

    return value;
  }

  logExecutionStarted(executionId: string): void {
    this.logger.log(`[${executionId}] Agent execution started`);
  }

  logAiRequest(data: AiRequestLogData): void {
    this.logger.log(
      `[${data.executionId}] AI request ${JSON.stringify({
        callNumber: data.callNumber,
        model: data.model,
        messageCount: data.messageCount,
        toolCount: data.toolCount,
      })}`,
    );
  }

  logAiResponse(data: AiResponseLogData): void {
    this.logger.log(
      `[${data.executionId}] AI response ${JSON.stringify({
        callNumber: data.callNumber,
        toolCallRequested: data.toolCallRequested,
        toolCallCount: data.toolCallCount,
        responseDurationMs: data.responseDurationMs,
      })}`,
    );
  }

  logToolCall(data: ToolCallLogData): void {
    this.logger.log(
      `[${data.executionId}] Tool call ${JSON.stringify({
        tool: data.tool,
        arguments: this.sanitizeArguments(data.arguments),
      })}`,
    );
  }

  logToolResult(data: ToolResultLogData): void {
    this.logger.log(
      `[${data.executionId}] Tool result: ${data.tool} ${JSON.stringify({
        durationMs: data.durationMs,
        resultCount: data.resultCount,
        status: data.status,
      })}`,
    );
  }

  logFinalResponse(data: FinalResponseLogData): void {
    this.logger.log(
      `[${data.executionId}] AI final response ${JSON.stringify({
        durationMs: data.durationMs,
        aiCalls: data.aiCalls,
        toolCalls: data.toolCalls,
        status: data.status,
      })}`,
    );
  }

  logExecutionCompleted(metrics: AgentExecutionMetrics): void {
    this.logger.log(
      `[${metrics.executionId}] Agent execution completed ${JSON.stringify({
        executionId: metrics.executionId,
        durationMs: metrics.durationMs,
        aiCalls: metrics.aiCalls,
        toolCalls: metrics.toolCalls,
        status: metrics.status,
      })}`,
    );
  }

  logError(data: AgentErrorLogData, error?: Error): void {
    const payload = {
      executionId: data.executionId,
      operation: data.operation,
      tool: data.tool,
      errorMessage: data.errorMessage ?? error?.message,
      durationMs: data.durationMs,
      status: data.status,
    };

    this.logger.error(
      `[${data.executionId}] ${data.operation} failed ${JSON.stringify(payload)}`,
      error?.stack,
      data.operation,
    );
  }
}
