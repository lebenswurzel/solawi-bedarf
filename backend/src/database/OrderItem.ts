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
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Product } from "./Product";
import { Order } from "./Order";
import { BaseEntity } from "./BaseEntity";

@Entity()
export class OrderItem extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: false,
    default: 0,
  })
  value: number;

  @Column()
  productId: number;

  @ManyToOne(() => Product, { nullable: false })
  product: Product;

  @Column()
  orderId: number;

  @ManyToOne(() => Order, (order) => order.orderItems, { nullable: false })
  order: Order;
}
