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
import { BaseEntity } from "./BaseEntity";
import { Shipment } from "./Shipment";
import { Depot } from "./Depot";
import { Unit } from "../../../shared/src/enum";

@Entity()
export class AdditionalShipmentItem extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  shipmentId: number;

  @ManyToOne(() => Shipment, (shipment) => shipment.shipmentItems, {
    nullable: false,
  })
  shipment: Shipment;

  @Column({ nullable: false })
  depotId: number;

  @ManyToOne(() => Depot, { nullable: false })
  depot: Depot;

  @Column({ nullable: false })
  product: string;

  @Column({ type: "varchar", nullable: true })
  description: string | null;

  @Column({
    type: "enum",
    enum: Unit,
  })
  unit: Unit;

  @Column({
    nullable: false,
  })
  quantity: number;

  @Column()
  totalShipedQuantity: number;

  @Column()
  isBio: boolean;
}
