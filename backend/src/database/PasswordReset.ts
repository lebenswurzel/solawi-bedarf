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
import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { generateRandomString } from "../security";
import { addHours } from "date-fns";
import { User } from "./User";

@Entity()
export class PasswordReset {
  constructor(user: User) {
    this.user = user;
    this.token = generateRandomString(128);
    this.expireAt = addHours(new Date(), 24);
  }

  @ManyToOne(() => User, (user) => user.passwordResets, { nullable: false })
  readonly user: User;

  @PrimaryColumn({ type: "varchar", length: 128, collation: "C" })
  readonly token: string | null;

  @Column({ type: "timestamp" })
  readonly expireAt: Date | null;

  /**
   * Check if password reset token is valid.
   *
   * @param token Password reset token
   * @returns {@code true} iff token is valid
   */
  isTokenValid(token: string): boolean {
    // Check expiry
    if (!this.expireAt || new Date() >= this.expireAt) {
      return false;
    }

    // Check token
    return token === this.token;
  }
}
