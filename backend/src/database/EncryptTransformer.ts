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
// encrypt.transformer.ts
import { ValueTransformer } from "typeorm";
import * as crypto from "crypto";
import { config } from "../config";

const algorithm = "aes-256-cbc";
const key = crypto
  .createHash("sha256")
  .update(config.db.secret)
  .digest("base64")
  .substring(0, 32);

export class EncryptTransformer implements ValueTransformer {
  to(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encryptedValue = cipher.update(value, "utf8", "hex");
    encryptedValue += cipher.final("hex");
    return `${Buffer.from(iv).toString("hex")}.${encryptedValue}`;
  }

  from(value: string): string {
    if (value === null) {
      return "";
    }
    const [iv, encryptedValue] = value.split(".");
    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Uint8Array.from(Buffer.from(iv, "hex")),
    );
    let decryptedValue = decipher.update(encryptedValue, "hex", "utf8");
    decryptedValue += decipher.final("utf8");
    return decryptedValue;
  }
}
