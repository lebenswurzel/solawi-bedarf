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
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";

@Entity()
export class ErrorLog extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  method: string;

  @Column()
  url: string;

  @Column()
  status: number;

  @Column({ type: "jsonb" })
  error: {
    name?: string;
    message: string;
    stack?: string[];
  };

  @Column({ type: "jsonb", nullable: true })
  requestBody: any;

  @Column({ type: "jsonb", nullable: true })
  requestQuery: any;

  @Column({ type: "jsonb", nullable: true })
  requestHeaders: any;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  ip: string;

  @Column({ nullable: true })
  userId: number;

  @ManyToOne(() => User, { nullable: true })
  user: User;
}
