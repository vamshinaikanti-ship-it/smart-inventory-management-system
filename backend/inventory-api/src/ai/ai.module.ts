import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AgentLogger } from './ai.logger';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ProductsModule],
  controllers: [AiController],
  providers: [AiService, AgentLogger],
  exports: [AgentLogger],
})
export class AiModule {}
