import { Injectable, Logger } from '@nestjs/common';
import { Product } from './product.interface';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly products: Product[] = [
    {
      id: 1,
      name: 'Product 1',
      price: 10,
      description: 'Description 1',
      quantity: 5,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      name: 'Product 2',
      price: 20,
      description: 'Description 2',
      quantity: 10,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 3,
      name: 'Product 3',
      price: 30,
      description: 'Description 3',
      quantity: 15,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 4,
      name: 'MacBook Air M5',
      price: 97711,
      description: 'Description 4',
      quantity: 20,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  getAll(): Product[] {
    this.logger.log('Fetching all products');
    return this.products;
  }

  findById(id: number): Product | undefined {
    const product = this.products.find((product) => product.id === id);
    if (product) {
      this.logger.log(`Fetching product with id ${id}`);
    } else {
      this.logger.warn(`Product with id ${id} not found`);
    }
    return product;
  }

  searchByName(name: string): Product[] {
    this.logger.log(`Searching for products with name containing ${name}`);
    return this.products.filter((product) =>
      product.name.toLowerCase().includes(name.toLowerCase()),
    );
  }

  addProduct(createProductDto: CreateProductDto): void {
    const product: Product = {
      id: this.products.length + 1,
      name: createProductDto.name,
      description: createProductDto.description,
      price: createProductDto.price,
      quantity: createProductDto.quantity,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.logger.log(`Creating product ${createProductDto.name}`);
    this.products.push(product);
  }

  updateProduct(id: number, updatedProduct: Product): void {
    const index = this.products.findIndex((product) => product.id === id);
    if (index !== -1) {
      this.logger.log(`Updating product with id ${id}`);
      this.products[index] = updatedProduct;
    } else {
      this.logger.warn(`Product with id ${id} not found`);
    }
  }

  deleteProduct(id: number): void {
    const index = this.products.findIndex((product) => product.id === id);
    if (index !== -1) {
      this.logger.log(`Deleting product with id ${id}`);
      this.products.splice(index, 1);
    } else {
      this.logger.warn(`Product with id ${id} not found`);
    }
  }
}
