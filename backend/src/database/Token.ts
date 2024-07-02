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
import { Entity, Column, PrimaryColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity()
export class Token {
  @PrimaryColumn()
  jti: string;

  @Column()
  active: boolean;

  @Column()
  iat: Date;

  @Column()
  exp: Date;

  @Column({ nullable: false })
  userId: number;

  @ManyToOne(() => User, (user) => user.token, { nullable: false })
  user: User;
}
