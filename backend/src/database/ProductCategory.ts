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
  OneToMany,
  ManyToOne,
} from "typeorm";
import { Product } from "./Product";
import { BaseEntity } from "./BaseEntity";
import { RequisitionConfig } from "./RequisitionConfig";
import { ProductCategoryType } from "../../../shared/src/enum";

@Entity()
export class ProductCategory extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  active: boolean;

  @OneToMany(() => Product, (product) => product.productCategory)
  products: Product[];

  @Column()
  requisitionConfigId: number;

  @ManyToOne(
    () => RequisitionConfig,
    (requisitionConfig) => requisitionConfig.productCategories,
    { nullable: false },
  )
  requisitionConfig: RequisitionConfig;

  @Column({
    type: "enum",
    enum: ProductCategoryType,
    nullable: false,
  })
  typ: ProductCategoryType;
}
