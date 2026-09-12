import { AiService } from './ai.service';

describe('AiService', () => {
  it('should gracefully handle non-JSON model text by returning an empty product list', () => {
    const service = new AiService({} as any);

    const result = (service as any).parseAiAnswer(
      "I do not have access to your personal inventory, a specific store's database, or a list of products unless you provide that information to me.",
    );

    expect(result).toEqual({
      answer:
        "I do not have access to your personal inventory, a specific store's database, or a list of products unless you provide that information to me.",
      products: [],
    });
  });
});
