import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getAllProducts(): Promise<Product[]> {
    return this.productsService.getAll();
  }

  @Get('search')
  searchProductsByName(@Query('name') name: string): Promise<Product[]> {
    if (!name) {
      return Promise.resolve([]);
    }

    return this.productsService.searchByName(name);
  }

  @Get(':id')
  getProductById(@Param('id', ParseIntPipe) id: number): Promise<Product> {
    return this.productsService.findById(id);
  }

  @Post()
  createProduct(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  @Put(':id')
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  async deleteProduct(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.productsService.delete(id);

    return {
      message: `Product with id ${id} deleted successfully`,
    };
  }
}
