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
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Token } from "./Token";
import { Order } from "./Order";
import { BaseEntity } from "./BaseEntity";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { Applicant } from "./Applicant";
import { generateRandomString, hashPassword } from "../security";
import { addHours } from "date-fns";

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  active: boolean;

  @Column()
  hash: string;

  @Column({ nullable: true, type: "varchar", length: 32, collation: "C" })
  private password_reset_token: string | null;

  @Column({ nullable: true, type: "timestamp" })
  private password_reset_expire_date: Date | null;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @OneToMany(() => Token, (token) => token.user)
  token: Token[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToOne(() => Applicant, (applicant) => applicant.user, { nullable: true })
  applicant: Applicant;

  /**
   * Create new user.
   *
   * @param name User name
   * @param hash Password hash
   * @param role User role
   * @param active Is user active?
   */
  constructor(name: string, hash: string, role: UserRole, active: boolean) {
    super();
    this.name = name;
    this.hash = hash;
    this.role = role;
    this.active = active;
  }

  /**
   * Start password reset.
   *
   * Flow:
   * * User requests password reset (call this function)
   * * Token is sent to user by a known channel (like e-mail)
   * * User sends token and new password ({@link resetPassword})
   *
   * @returns Password reset token, needed for real password reset
   */
  public startPasswordReset(): string {
    const token = generateRandomString(16);
    this.password_reset_token = token;
    this.password_reset_expire_date = addHours(new Date(), 24);
    return token;
  }

  /**
   * Reset password
   *
   * @param token Token from {@link startPasswordReset}
   * @param newPassword New password hash
   * @returns {@code true} iff password reset succeeded
   */
  public async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<boolean> {
    // Check expire
    const expires_at = this.password_reset_expire_date;
    if (!expires_at || new Date() >= expires_at) {
      return false;
    }

    if (token === this.password_reset_token) {
      this.hash = await hashPassword(newPassword);
      this.password_reset_token = null;
      this.password_reset_expire_date = null;
      return true;
    } else {
      return false;
    }
  }
}
