import { BadGatewayException, Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { AiToolExecutionResult } from './interfaces/ai-tool.interface';

interface AiToolDefinition {
  execute: (argumentsValue: unknown) => Promise<AiToolExecutionResult>;
}

@Injectable()
export class AiToolRegistry {
  private readonly tools: ReadonlyMap<string, AiToolDefinition>;

  constructor(private readonly productsService: ProductsService) {
    this.tools = new Map([
      [
        'get_low_stock_products',
        { execute: (value) => this.getLowStock(value) },
      ],
      ['search_products', { execute: (value) => this.searchProducts(value) }],
      ['get_product_by_id', { execute: (value) => this.getProductById(value) }],
      ['get_total_inventory', { execute: () => this.getTotalInventory() }],
      ['get_inventory_value', { execute: () => this.getInventoryValue() }],
      [
        'get_products_by_category',
        { execute: (value) => this.getProductsByCategory(value) },
      ],
      [
        'get_out_of_stock_products',
        { execute: () => this.getOutOfStockProducts() },
      ],
    ]);
  }

  async execute(
    toolName: string,
    argumentsValue: unknown,
  ): Promise<AiToolExecutionResult> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new BadGatewayException(`Unsupported AI function: ${toolName}`);
    }

    return tool.execute(argumentsValue);
  }

  private async getLowStock(argumentsValue: unknown) {
    const { threshold } = this.parseRequiredNumber(
      argumentsValue,
      'threshold',
      true,
    );
    const products = await this.productsService.getLowStockProducts(threshold);

    return this.productListResult(products);
  }

  private async searchProducts(argumentsValue: unknown) {
    const argumentsObject = this.parseArguments(argumentsValue);
    const { query, limit } = argumentsObject;

    if (typeof query !== 'string' || query.trim().length === 0) {
      throw new BadGatewayException('AI returned invalid tool arguments');
    }

    const normalizedLimit =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.min(Math.trunc(limit), 20)
        : 10;
    const products = await this.productsService.searchByName(
      query.trim(),
      normalizedLimit,
    );

    return this.productListResult(products);
  }

  private async getProductById(argumentsValue: unknown) {
    const { id } = this.parseRequiredNumber(argumentsValue, 'id');
    const product = await this.productsService.findById(id);

    return {
      resultCount: product ? 1 : 0,
      content: JSON.stringify(
        product
          ? { id: product.id, name: product.name, quantity: product.quantity }
          : null,
      ),
    };
  }

  private async getTotalInventory() {
    const total = await this.productsService.getTotalInventory();

    return { resultCount: 1, value: total, content: JSON.stringify({ total }) };
  }

  private async getInventoryValue() {
    const value = await this.productsService.getInventoryValue();

    return { resultCount: 1, value, content: JSON.stringify({ value }) };
  }

  private async getProductsByCategory(argumentsValue: unknown) {
    const { category_id } = this.parseRequiredNumber(
      argumentsValue,
      'category_id',
    );
    const products =
      await this.productsService.getProductsByCategory(category_id);

    return this.productListResult(products);
  }

  private async getOutOfStockProducts() {
    const products = await this.productsService.getOutOfStockProducts();

    return this.productListResult(products);
  }

  private productListResult(
    products: Array<{ id: number; name: string; quantity: number }>,
  ) {
    return {
      resultCount: products.length,
      content: JSON.stringify(
        products.map(({ id, name, quantity }) => ({ id, name, quantity })),
      ),
    };
  }

  private parseRequiredNumber(
    argumentsValue: unknown,
    property: string,
    allowZero = false,
  ): Record<string, number> {
    const argumentsObject = this.parseArguments(argumentsValue);
    const value = argumentsObject[property];

    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      (allowZero ? value < 0 : value <= 0)
    ) {
      throw new BadGatewayException('AI returned invalid tool arguments');
    }

    return { [property]: value };
  }

  private parseArguments(argumentsValue: unknown): Record<string, unknown> {
    try {
      const argumentsObject =
        typeof argumentsValue === 'string'
          ? (JSON.parse(argumentsValue) as unknown)
          : argumentsValue;

      if (
        typeof argumentsObject !== 'object' ||
        argumentsObject === null ||
        Array.isArray(argumentsObject)
      ) {
        throw new Error('Invalid tool arguments');
      }

      return argumentsObject as Record<string, unknown>;
    } catch {
      throw new BadGatewayException('AI returned invalid tool arguments');
    }
  }
}
