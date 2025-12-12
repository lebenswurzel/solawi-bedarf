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
import { generateRandomString } from "./security";

test("random string has expected length", () => {
  expect(generateRandomString(23)).toHaveLength(23);
});

test("random string is random", () => {
  expect(generateRandomString(16)).not.eq(generateRandomString(16));
});

test("random string can be empty", () => {
  expect(generateRandomString(0)).toHaveLength(0);
});
