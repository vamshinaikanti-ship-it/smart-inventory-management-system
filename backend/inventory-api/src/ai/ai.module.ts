import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AgentLogger } from './ai.logger';
import { ProductsModule } from '../products/products.module';
import { AI_TOOL_EXECUTOR_PROVIDER } from './ai-tool.executor';
import { AiToolRegistry } from './ai-tool.registry';

@Module({
  imports: [ProductsModule],
  controllers: [AiController],
  providers: [
    AiService,
    AgentLogger,
    AiToolRegistry,
    AI_TOOL_EXECUTOR_PROVIDER,
  ],
  exports: [AgentLogger],
})
export class AiModule {}
