import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    this.logger.log('Creating a new category');
    const existingCategory = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Category ${createCategoryDto.name} already exists`,
      );
    }

    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  findAll(): Promise<Category[]> {
    this.logger.log('Fetching all categories');
    return this.categoryRepository.find();
  }

  async findOne(id: number): Promise<Category> {
    this.logger.log(`Fetching category with id ${id}`);
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    return category;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    this.logger.log(`Updating category ${id} (${updateCategoryDto.name})`);
    const category = await this.categoryRepository.preload({
      id,
      ...updateCategoryDto,
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    const existingCategory = await this.categoryRepository.findOne({
      where: {
        name: updateCategoryDto.name,
      },
    });

    if (existingCategory && existingCategory.id !== id) {
      throw new ConflictException('Category name already exists');
    }

    return this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`Removing category ${id}`);
    const result = await this.categoryRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Category ${id} not found`);
    }
  }
}
