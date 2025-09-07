import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { generateRandomString } from "../security";
import { addHours } from "date-fns";
import { User } from "./User";

@Entity()
export class PasswordReset {
  constructor() {
    this._token = generateRandomString(128);
    this._expireAt = addHours(new Date(), 24);
  }

  @ManyToOne(() => User, (user) => user.passwordReset, { nullable: false })
  user: User;

  @PrimaryColumn({ type: "varchar", length: 128, collation: "C" })
  private _token: string | null;

  @Column({ type: "timestamp" })
  private _expireAt: Date | null;

  get token(): string | null {
    return this._token;
  }

  get expireAt(): Date | null {
    return this._expireAt;
  }

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
