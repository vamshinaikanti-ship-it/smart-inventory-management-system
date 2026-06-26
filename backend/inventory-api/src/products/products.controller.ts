import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import * as productInterface from './product.interface';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
  @Get()
  getAllProducts() {
    return this.productsService.getAll();
  }

  @Get('search')
  searchProductsByName(@Query('name') name: string) {
    if (!name) {
      return [];
    }
    return this.productsService.searchByName(name);
  }

  @Get(':id')
  getProductById(@Param('id', ParseIntPipe) id: number) {
    const product = this.productsService.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }

  @Post()
  createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productsService.addProduct(createProductDto);
  }

  @Put(':id')
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatedProduct: productInterface.Product,
  ) {
    this.productsService.updateProduct(id, updatedProduct);
    return this.productsService.findById(id);
  }

  @Delete(':id')
  deleteProduct(@Param('id', ParseIntPipe) id: number) {
    const product = this.productsService.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    this.productsService.deleteProduct(id);
    return { message: `Product with id ${id} deleted successfully` };
  }
}
