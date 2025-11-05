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
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { Token } from "./database/Token";
import { randomBytes } from "crypto";

export function hashPassword(plaintextPassword: string) {
  return bcrypt.hash(plaintextPassword, 10);
}

// compare password
export async function comparePassword(plaintextPassword: string, hash: string) {
  return await bcrypt.compare(plaintextPassword, hash);
}

export function createJwt(token: Token) {
  return jwt.sign(
    {
      exp: Math.round(token.exp.getTime() / 1000),
      iat: Math.round(token.iat.getTime() / 1000),
      jti: token.jti,
    },
    config.jwt.secret,
  );
}

const ALPHANUM =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateRandomString(length: number): string {
  return Array.from(
    randomBytes(length),
    (n) => ALPHANUM[n % ALPHANUM.length],
  ).join("");
}
