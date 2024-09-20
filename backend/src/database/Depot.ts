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
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { Order } from "./Order";
import { BaseEntity } from "./BaseEntity";

@Entity()
export class Depot extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  address: string;

  @Column()
  openingHours: string;

  @Column({ nullable: true })
  comment: string;

  @Column({ type: "integer", nullable: true })
  capacity: number | null;

  @Column()
  rank: number;

  @Column()
  active: boolean;

  @OneToMany(() => Order, (order) => order.depot)
  orders: Order[];
}
