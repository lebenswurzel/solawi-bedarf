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
import { expect, test } from "vitest";
import { calculateExpirationTimeStamp } from "./login";

test("expiration time stamp", () => {
  const issuedAt = new Date("2024-09-11 12:34:56");

  // one hour
  let expirationTime = calculateExpirationTimeStamp(issuedAt, 60 * 60 * 1000);
  expect(expirationTime).toEqual(new Date("2024-09-11 13:34:56").getTime());

  // until midnight
  expirationTime = calculateExpirationTimeStamp(issuedAt, 60 * 60 * 1000, true);
  expect(expirationTime).toEqual(new Date("2024-09-11 23:59:59").getTime());
});
