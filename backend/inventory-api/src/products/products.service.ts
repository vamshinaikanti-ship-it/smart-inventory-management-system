import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getAll(): Promise<Product[]> {
    this.logger.log('Fetching all products');
    return this.productRepository.find();
  }

  async findById(id: number): Promise<Product> {
    this.logger.log(`Fetching product with id ${id}`);

    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      this.logger.warn(`Product with id ${id} not found`);
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return product;
  }

  async searchByName(name: string): Promise<Product[]> {
    this.logger.log(`Searching products with name "${name}"`);

    return this.productRepository.find({
      where: {
        name: ILike(`%${name}%`),
      },
    });
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    this.logger.log(`Creating product "${createProductDto.name}"`);

    const product = this.productRepository.create(createProductDto);

    return this.productRepository.save(product);
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findById(id);

    Object.assign(product, updateProductDto);

    this.logger.log(`Updating product with id ${id}`);

    return this.productRepository.save(product);
  }

  async delete(id: number): Promise<void> {
    const product = await this.findById(id);

    this.logger.log(`Deleting product with id ${id}`);

    await this.productRepository.remove(product);
  }
}
