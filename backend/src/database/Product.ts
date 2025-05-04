/*
This file is part of the SoLawi Bedarf app

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { ProductCategory } from "./ProductCategory";
import { BaseEntity } from "./BaseEntity";
import { OrderItem } from "./OrderItem";
import { Unit } from "@lebenswurzel/solawi-bedarf-shared/src/enum";

@Entity()
export class Product extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  active: boolean;

  @Column({
    nullable: false,
  })
  msrp: number;

  @Column({ nullable: false, default: 1 })
  frequency: number;

  @Column({
    nullable: false,
  })
  quantity: number;

  @Column({
    nullable: false,
  })
  quantityMin: number;

  @Column({
    nullable: false,
  })
  quantityMax: number;

  @Column({
    nullable: false,
  })
  quantityStep: number;

  @Column({
    type: "enum",
    enum: Unit,
  })
  unit: Unit;

  @Column()
  productCategoryId: number;

  @ManyToOne(
    () => ProductCategory,
    (productCategory) => productCategory.products,
    { nullable: false },
  )
  productCategory: ProductCategory;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  orderItems: OrderItem[];
}
