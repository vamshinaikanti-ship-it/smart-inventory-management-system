import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column('numeric', { precision: 10, scale: 2 })
  price!: number;

  @Column()
  quantity!: number;

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: false,
  })
  @JoinColumn({ name: 'category_id' })
  category!: Category;
}
