export interface AiToolExecutionResult {
  content: string;
  resultCount?: number;
  value?: unknown;
}

export interface AiToolExecutorPort {
  execute(
    toolName: string,
    argumentsValue: unknown,
  ): Promise<AiToolExecutionResult>;
}
