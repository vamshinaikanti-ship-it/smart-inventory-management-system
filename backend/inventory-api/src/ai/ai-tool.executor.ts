import { Injectable, Provider } from '@nestjs/common';
import { AiToolRegistry } from './ai-tool.registry';
import { AI_TOOL_EXECUTOR_TOKEN } from './constants/ai.constants';
import { AiToolExecutionResult } from './interfaces/ai-tool.interface';

@Injectable()
export class AiToolExecutor {
  constructor(private readonly toolRegistry: AiToolRegistry) {}

  execute(
    toolName: string,
    argumentsValue: unknown,
  ): Promise<AiToolExecutionResult> {
    return this.toolRegistry.execute(toolName, argumentsValue);
  }
}

export const AI_TOOL_EXECUTOR_PROVIDER: Provider = {
  provide: AI_TOOL_EXECUTOR_TOKEN,
  useClass: AiToolExecutor,
};
