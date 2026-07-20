import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsOrder,
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/produt-query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

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

  async findAll(query: ProductQueryDto): Promise<PaginatedResponse<Product>> {
    this.logger.log('Fetching products');

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: FindOptionsWhere<Product> = {};

    if (query.search) {
      where.name = ILike(`%${query.search}%`);
    }

    if (query.minPrice !== undefined && query.maxPrice !== undefined) {
      where.price = Between(query.minPrice, query.maxPrice);
    } else if (query.minPrice !== undefined) {
      where.price = MoreThanOrEqual(query.minPrice);
    } else if (query.maxPrice !== undefined) {
      where.price = LessThanOrEqual(query.maxPrice);
    }

    if (query.minStock !== undefined) {
      where.quantity = MoreThanOrEqual(query.minStock);
    }

    const order: FindOptionsOrder<Product> = query.sortBy
      ? { [query.sortBy]: query.order ?? 'ASC' }
      : { id: 'DESC' };

    const [products, total] = await this.productRepository.findAndCount({
      where,
      order,
      skip,
      take: pageSize,
    });

    return {
      data: products,
      pagination: {
        page,
        pageSize,
        totalRecords: total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page * pageSize < total,
        hasPreviousPage: page > 1,
      },
    };
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
