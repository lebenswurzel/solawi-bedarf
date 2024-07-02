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
import { Token } from "./Token";
import { Order } from "./Order";
import { BaseEntity } from "./BaseEntity";
import { UserRole } from "../../../shared/src/enum";

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  active: boolean;

  @Column()
  hash: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @OneToMany(() => Token, (token) => token.user)
  token: Token[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];
}
