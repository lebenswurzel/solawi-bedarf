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
import { OrderPaymentType } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { EncryptTransformer } from "./EncryptTransformer";
import { BaseEntity } from "./BaseEntity";

@Entity()
export class PaymentInfo extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: OrderPaymentType,
    nullable: false,
  })
  paymentType: OrderPaymentType;

  @Column({
    nullable: false,
    default: false,
  })
  paymentRequired: boolean;

  @Column({
    nullable: false,
    default: false,
  })
  paymentProcessed: boolean;

  @Column({
    nullable: false,
    default: 0,
  })
  amount: number;

  @Column({ transformer: new EncryptTransformer() })
  bankDetails: string; // JSON stringified BankDetails
}
