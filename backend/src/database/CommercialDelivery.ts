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
  OneToMany,
  ManyToOne,
  OneToOne,
  JoinColumn,
  RelationId,
} from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import { CommercialDeliveryItem } from "./CommercialDeliveryItem";
import { Invoice } from "./Invoice";

@Entity()
export class CommercialDelivery extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "timestamp",
    nullable: false,
  })
  deliveryDate: Date;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "customerUserId" })
  customer: User;

  @RelationId((delivery: CommercialDelivery) => delivery.customer)
  customerUserId: number;

  @Column({ type: "varchar", nullable: true })
  description: string | null;

  @Column({ nullable: false })
  active: boolean;

  @OneToMany(() => CommercialDeliveryItem, (item) => item.commercialDelivery, {
    cascade: true,
  })
  items: CommercialDeliveryItem[];

  @OneToOne(() => Invoice, (invoice) => invoice.commercialDelivery)
  invoice: Invoice | null;
}
