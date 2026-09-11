import { AiProductResult } from './ai-product-result.interface';

export interface AiAnswer {
  answer: string;
  products: AiProductResult[];
}
