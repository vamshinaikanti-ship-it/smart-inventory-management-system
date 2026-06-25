import { Injectable } from '@nestjs/common';
import { Product } from './product.interface';

@Injectable()
export class ProductsService {
  private readonly products: Product[] = [
    { id: 1, name: 'Product 1', price: 10 },
    { id: 2, name: 'Product 2', price: 20 },
    { id: 3, name: 'Product 3', price: 30 },
    {
      id: 4,
      name: 'MacBook Air M5',
      price: 97711,
    },
  ];

  getAll(): Product[] {
    return this.products;
  }

  findById(id: number): Product | undefined {
    return this.products.find((product) => product.id === id);
  }

  searchByName(name: string): Product[] {
    return this.products.filter((product) =>
      product.name.toLowerCase().includes(name.toLowerCase()),
    );
  }

  addProduct(product: Product): void {
    this.products.push(product);
  }

  updateProduct(id: number, updatedProduct: Product): void {
    const index = this.products.findIndex((product) => product.id === id);
    if (index !== -1) {
      this.products[index] = updatedProduct;
    }
  }

  deleteProduct(id: number): void {
    const index = this.products.findIndex((product) => product.id === id);
    if (index !== -1) {
      this.products.splice(index, 1);
    }
  }
}
