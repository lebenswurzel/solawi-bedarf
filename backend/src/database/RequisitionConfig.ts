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
import { BaseEntity } from "./BaseEntity";
import { ProductCategory } from "./ProductCategory";

export const RequisitionConfigName = "Saison 24/25";

@Entity()
export class RequisitionConfig extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  startOrder: Date;

  @Column()
  startBiddingRound: Date;

  @Column()
  endBiddingRound: Date;

  @Column()
  budget: number;

  @Column({
    type: "timestamp",
    nullable: false,
  })
  validFrom: Date;

  @Column({
    type: "timestamp",
    nullable: false,
  })
  validTo: Date;

  @OneToMany(
    () => ProductCategory,
    (productCategory) => productCategory.requisitionConfig,
  )
  productCategories: ProductCategory[];

  @Column({ default: true })
  public: boolean;
}
