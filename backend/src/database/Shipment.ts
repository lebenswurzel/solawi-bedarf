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
} from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { ShipmentItem } from "./ShipmentItem";
import { AdditionalShipmentItem } from "./AdditionalShipmentItem";
import { RequisitionConfig } from "./RequisitionConfig";
import { RevisionMessageJson } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { ShipmentType } from "@lebenswurzel/solawi-bedarf-shared/src/enum";

@Entity()
export class Shipment extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  active: boolean;

  @Column({
    type: "timestamp",
    nullable: false,
  })
  public validFrom: Date;

  @Column({ type: "varchar", nullable: true })
  description: string | null;

  @OneToMany(() => ShipmentItem, (shipmentItem) => shipmentItem.shipment)
  shipmentItems: ShipmentItem[];

  @OneToMany(
    () => AdditionalShipmentItem,
    (additionalShipmentItem) => additionalShipmentItem.shipment,
  )
  additionalShipmentItems: AdditionalShipmentItem[];

  @Column()
  requisitionConfigId: number;

  @ManyToOne(() => RequisitionConfig, { nullable: false })
  requisitionConfig: RequisitionConfig;

  @Column({ type: "json", nullable: true })
  revisionMessages: RevisionMessageJson[] | null;

  @Column({ type: "enum", enum: ShipmentType, default: ShipmentType.NORMAL })
  type: ShipmentType;
}
