import { IsNotEmpty, IsString } from 'class-validator';

export class AskAiDto {
  @IsString()
  @IsNotEmpty()
  question!: string;
}
