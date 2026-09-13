import { Logger } from '@nestjs/common';
import { AgentLogger } from './ai.logger';
import { AiService } from './ai.service';
import { ProductsService } from '../products/products.service';

describe('AgentLogger', () => {
  it('should write structured execution events with an execution id', () => {
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    const logger = new AgentLogger();
    logger.logExecutionStarted('agent-123456');
    logger.logToolCall({
      executionId: 'agent-123456',
      tool: 'get_low_stock_products',
      arguments: { threshold: 10 },
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[agent-123456] Agent execution started'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"tool":"get_low_stock_products"'),
    );

    logSpy.mockRestore();
  });
});

describe('AiService', () => {
  it('should gracefully handle non-JSON model text by returning an empty product list', () => {
    const service = new AiService(
      {} as unknown as ProductsService,
      new AgentLogger(),
    );

    const parseResult = (
      service as unknown as {
        parseAiAnswer: (output: string) => {
          answer: string;
          products: unknown[];
        };
      }
    ).parseAiAnswer(
      "I do not have access to your personal inventory, a specific store's database, or a list of products unless you provide that information to me.",
    );

    expect(parseResult).toEqual({
      answer:
        "I do not have access to your personal inventory, a specific store's database, or a list of products unless you provide that information to me.",
      products: [],
    });
  });

  it('should assign an execution id and count ai/tool calls for a successful run', async () => {
    const logger: Pick<
      AgentLogger,
      | 'generateExecutionId'
      | 'logExecutionStarted'
      | 'logAiRequest'
      | 'logAiResponse'
      | 'logToolCall'
      | 'logToolResult'
      | 'logFinalResponse'
      | 'logExecutionCompleted'
      | 'logError'
      | 'sanitizeArguments'
    > = {
      generateExecutionId: jest.fn(() => 'agent-123456'),
      logExecutionStarted: jest.fn(),
      logAiRequest: jest.fn(),
      logAiResponse: jest.fn(),
      logToolCall: jest.fn(),
      logToolResult: jest.fn(),
      logFinalResponse: jest.fn(),
      logExecutionCompleted: jest.fn(),
      logError: jest.fn(),
      sanitizeArguments: jest.fn((value: unknown) => value),
    };

    const productsService = {
      getLowStockProducts: jest
        .fn()
        .mockResolvedValue([{ id: 1, name: 'Notebook', quantity: 4 }]),
    } as Pick<ProductsService, 'getLowStockProducts'>;

    const service = new AiService(productsService, logger as AgentLogger);
    const chat = jest
      .fn()
      .mockResolvedValueOnce({
        message: {
          content: '',
          tool_calls: [
            {
              function: {
                name: 'get_low_stock_products',
                arguments: JSON.stringify({ threshold: 10 }),
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        message: {
          content: JSON.stringify({
            answer: 'Here are the low-stock items.',
            products: [{ id: 1, name: 'Notebook', quantity: 4 }],
          }),
        },
      });

    jest
      .spyOn(
        service as unknown as {
          getOllamaClient: () => { chat: typeof chat };
        },
        'getOllamaClient',
      )
      .mockReturnValue({ chat });

    const result = await service.inventoryAssistant(
      'Which items are low in stock?',
    );

    expect(result.answer).toBe('Here are the low-stock items.');
    expect(logger.logExecutionStarted).toHaveBeenCalledWith(
      expect.stringMatching(/^agent-/),
    );
    expect(logger.logAiRequest).toHaveBeenCalledTimes(2);
    expect(logger.logToolCall).toHaveBeenCalledTimes(1);
    expect(logger.logToolResult).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: 'get_low_stock_products',
        status: 'success',
      }),
    );
    expect(logger.logExecutionCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        aiCalls: 2,
        toolCalls: 1,
        status: 'success',
      }),
    );
  });

  it('should log failure when the agent run fails', async () => {
    const logger: Pick<
      AgentLogger,
      | 'generateExecutionId'
      | 'logExecutionStarted'
      | 'logAiRequest'
      | 'logAiResponse'
      | 'logToolCall'
      | 'logToolResult'
      | 'logFinalResponse'
      | 'logExecutionCompleted'
      | 'logError'
      | 'sanitizeArguments'
    > = {
      generateExecutionId: jest.fn(() => 'agent-123456'),
      logExecutionStarted: jest.fn(),
      logAiRequest: jest.fn(),
      logAiResponse: jest.fn(),
      logToolCall: jest.fn(),
      logToolResult: jest.fn(),
      logFinalResponse: jest.fn(),
      logExecutionCompleted: jest.fn(),
      logError: jest.fn(),
      sanitizeArguments: jest.fn((value: unknown) => value),
    };

    const service = new AiService(
      {} as unknown as ProductsService,
      logger as AgentLogger,
    );
    const chat = jest.fn().mockRejectedValue(new Error('ollama unavailable'));

    jest
      .spyOn(
        service as unknown as {
          getOllamaClient: () => { chat: typeof chat };
        },
        'getOllamaClient',
      )
      .mockReturnValue({ chat });

    await expect(
      service.inventoryAssistant('Which products are low in stock?'),
    ).rejects.toThrow('AI service request failed');

    expect(logger.logExecutionCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failure' }),
    );
    expect(logger.logError).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'inventoryAssistant',
        status: 'failure',
      }),
      expect.any(Error),
    );
  });
});
