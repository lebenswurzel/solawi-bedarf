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
  OneToOne,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import { UserAddress } from "./UserAddress";
import { EncryptTransformer } from "./EncryptTransformer";

@Entity()
export class Applicant extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hash: string;

  @Column()
  active: boolean; // true if the applicant awaits activation; false if a user was created from this applicant

  @Column()
  confirmGDPR: boolean;

  @Column({ transformer: new EncryptTransformer() })
  comment: string;

  @Column({ nullable: true })
  userId: number;

  @OneToOne(() => User, (user) => user.applicant, { nullable: true })
  @JoinColumn()
  user: User;

  @Column({ nullable: false })
  addressId: number;

  @OneToOne(() => UserAddress, { nullable: false })
  @JoinColumn()
  address: UserAddress;
}
