import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
