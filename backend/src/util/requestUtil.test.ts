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
import { getNumericQueryParameter } from "./requestUtil";
import { describe } from "node:test";

describe("test getNumericQueryValue", () => {
  test("with default fallback", () => {
    expect(getNumericQueryParameter({}, "x")).toEqual(-1);
    expect(getNumericQueryParameter({ x: "0" }, "x")).toEqual(0);
    expect(getNumericQueryParameter({ x: "3" }, "x")).toEqual(3);
    expect(getNumericQueryParameter({ x: "3", y: "4" }, "x")).toEqual(3);
    expect(getNumericQueryParameter({ x: "3", y: "4" }, "y")).toEqual(4);
    expect(getNumericQueryParameter({ x: undefined, y: "4" }, "x")).toEqual(-1);
    expect(getNumericQueryParameter({ x: ["3", "4"], y: "4" }, "x")).toEqual(
      -1,
    );
    expect(getNumericQueryParameter({ x: ["7", "8"], y: "4" }, "x")).toEqual(
      -1,
    );
    expect(getNumericQueryParameter({ x: "no number", y: "4" }, "x")).toEqual(
      -1,
    );
    expect(getNumericQueryParameter({ x: "3.14", y: "4" }, "x")).toEqual(3);
  });

  test("with fallback=0", () => {
    const FALLBACK = 0;
    expect(getNumericQueryParameter({}, "x", FALLBACK)).toEqual(FALLBACK);
    expect(getNumericQueryParameter({ x: "0" }, "x", FALLBACK)).toEqual(0);
    expect(getNumericQueryParameter({ x: "3" }, "x", FALLBACK)).toEqual(3);
    expect(getNumericQueryParameter({ x: "3", y: "4" }, "x", FALLBACK)).toEqual(
      3,
    );
    expect(getNumericQueryParameter({ x: "3", y: "4" }, "y", FALLBACK)).toEqual(
      4,
    );
    expect(
      getNumericQueryParameter({ x: undefined, y: "4" }, "x", FALLBACK),
    ).toEqual(FALLBACK);
    expect(
      getNumericQueryParameter({ x: ["3", "4"], y: "4" }, "x", FALLBACK),
    ).toEqual(FALLBACK);
    expect(
      getNumericQueryParameter({ x: ["7", "8"], y: "4" }, "x", FALLBACK),
    ).toEqual(FALLBACK);
    expect(
      getNumericQueryParameter({ x: "no number", y: "4" }, "x", FALLBACK),
    ).toEqual(FALLBACK);
    expect(
      getNumericQueryParameter({ x: "3.14", y: "4" }, "x", FALLBACK),
    ).toEqual(3);
  });

  test("with fallback=100", () => {
    const FALLBACK = 100;
    expect(getNumericQueryParameter({}, "x", FALLBACK)).toEqual(FALLBACK);
    expect(getNumericQueryParameter({ x: "0" }, "x", FALLBACK)).toEqual(0);
    expect(getNumericQueryParameter({ x: "3" }, "x", FALLBACK)).toEqual(3);
    expect(getNumericQueryParameter({ x: "3", y: "4" }, "x", FALLBACK)).toEqual(
      3,
    );
    expect(getNumericQueryParameter({ x: "3", y: "4" }, "y", FALLBACK)).toEqual(
      4,
    );
    expect(
      getNumericQueryParameter({ x: undefined, y: "4" }, "x", FALLBACK),
    ).toEqual(FALLBACK);
    expect(
      getNumericQueryParameter({ x: ["3", "4"], y: "4" }, "x", FALLBACK),
    ).toEqual(FALLBACK);
    expect(
      getNumericQueryParameter({ x: ["7", "8"], y: "4" }, "x", FALLBACK),
    ).toEqual(FALLBACK);
    expect(
      getNumericQueryParameter({ x: "no number", y: "4" }, "x", FALLBACK),
    ).toEqual(FALLBACK);
    expect(
      getNumericQueryParameter({ x: "3.14", y: "4" }, "x", FALLBACK),
    ).toEqual(3);
  });
});
