import { BadGatewayException } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { AiToolRegistry } from './ai-tool.registry';

describe('AiToolRegistry', () => {
  it('routes a tool to the matching inventory service method', async () => {
    const products = [{ id: 1, name: 'Notebook', quantity: 0 }];
    const getLowStockProducts = jest.fn().mockResolvedValue(products);
    const productsService = {
      getLowStockProducts,
    } as unknown as ProductsService;
    const registry = new AiToolRegistry(productsService);

    const result = await registry.execute(
      'get_low_stock_products',
      JSON.stringify({ threshold: 0 }),
    );

    expect(getLowStockProducts).toHaveBeenCalledWith(0);
    expect(result).toEqual({
      resultCount: 1,
      content: JSON.stringify(products),
    });
  });

  it('normalizes search input before calling the service', async () => {
    const searchByName = jest.fn().mockResolvedValue([]);
    const productsService = {
      searchByName,
    } as unknown as ProductsService;
    const registry = new AiToolRegistry(productsService);

    await registry.execute('search_products', {
      query: '  notebook  ',
      limit: 99,
    });

    expect(searchByName).toHaveBeenCalledWith('notebook', 20);
  });

  it('rejects unknown tools and invalid arguments', async () => {
    const registry = new AiToolRegistry({} as ProductsService);

    await expect(registry.execute('delete_everything', {})).rejects.toThrow(
      new BadGatewayException('Unsupported AI function: delete_everything'),
    );
    await expect(
      registry.execute('get_low_stock_products', { threshold: -1 }),
    ).rejects.toThrow('AI returned invalid tool arguments');
  });
});
