import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { AskAiDto } from './dto/ask-ai.dto';
import { AiAnswer } from './interfaces/ai-answer.interface';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ask')
  ask(@Body() askAiDto: AskAiDto): Promise<{ answer: string }> {
    return this.aiService.ask(askAiDto.question);
  }

  @Post('inventory-assistant')
  inventoryAssistant(@Body('question') question: string): Promise<AiAnswer> {
    return this.aiService.inventoryAssistant(question);
  }
}
