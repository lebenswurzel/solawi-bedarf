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
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { User } from "./User";
import { Depot } from "./Depot";
import { OrderItem } from "./OrderItem";
import { BaseEntity } from "./BaseEntity";
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { RequisitionConfig } from "./RequisitionConfig";

@Entity()
export class Order extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: false,
  })
  offer: number;

  @Column({ type: "timestamp", nullable: true })
  validFrom: Date | null;

  @Column({ type: "timestamp", nullable: true })
  validTo: Date | null;

  @Column({ type: "varchar", nullable: true })
  offerReason: string | null;

  @Column({
    type: "enum",
    enum: UserCategory,
    nullable: false,
  })
  category: UserCategory;

  @Column({ type: "varchar", nullable: true })
  categoryReason: string | null;

  @Column({ type: "json", nullable: false })
  productConfiguration: string;

  @Column({ nullable: false })
  userId: number;

  @ManyToOne(() => User, (user) => user.orders, { nullable: false })
  user: User;

  @Column({ nullable: true })
  depotId: number;

  @ManyToOne(() => Depot, (depot) => depot.orders, { nullable: false })
  depot: Depot;

  @Column({ type: "integer", nullable: true })
  alternateDepotId: number | null;

  @ManyToOne(() => Depot, { nullable: true })
  alternateDepot: Depot | null;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  orderItems: OrderItem[];

  @Column()
  requisitionConfigId: number;

  @ManyToOne(() => RequisitionConfig, { nullable: false })
  requisitionConfig: RequisitionConfig;
}
