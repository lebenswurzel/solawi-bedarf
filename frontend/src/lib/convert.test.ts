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
import { describe, it, expect } from "vitest";
import { splitTotal } from "./convert";

describe("splitTotal", () => {
  it("should handle empty input array", () => {
    const result = splitTotal([], 100);
    expect(result).toEqual([]);
  });

  it("should handle total = 0", () => {
    const values = [
      { depotId: 1, value: 10 },
      { depotId: 2, value: 20 },
      { depotId: 3, value: 30 },
    ];
    const result = splitTotal(values, 0);
    expect(new Set(result)).toEqual(
      new Set([
        { depotId: 1, value: 0 },
        { depotId: 2, value: 0 },
        { depotId: 3, value: 0 },
      ]),
    );
  });

  it("should handle all values = 0", () => {
    const values = [
      { depotId: 1, value: 0 },
      { depotId: 2, value: 0 },
      { depotId: 3, value: 0 },
    ];
    const result = splitTotal(values, 100);
    // When all values are 0, the split should be equal
    expect(new Set(result)).toEqual(
      new Set([
        { depotId: 1, value: 0 },
        { depotId: 2, value: 0 },
        { depotId: 3, value: 0 },
      ]),
    );
  });

  it("should handle single value = 0", () => {
    const values = [{ depotId: 1, value: 0 }];
    const result = splitTotal(values, 100);
    // When all values are 0, the split should be equal
    expect(new Set(result)).toEqual(new Set([{ depotId: 1, value: 0 }]));
  });

  it("should handle single value", () => {
    const values = [{ depotId: 1, value: 10 }];
    const result = splitTotal(values, 100);
    expect(result).toEqual([{ depotId: 1, value: 100 }]);
  });

  it("should handle equal values", () => {
    const values = [
      { depotId: 1, value: 10 },
      { depotId: 2, value: 10 },
      { depotId: 3, value: 10 },
    ];
    const result = splitTotal(values, 100);
    // The sum should equal the total
    expect(result.reduce((sum, item) => sum + item.value, 0)).toBe(100);
    // Values should be approximately equal
    expect(result.every((item) => item.value >= 33 && item.value <= 34)).toBe(
      true,
    );
  });

  it("should handle one value = 0", () => {
    const values = [
      { depotId: 1, value: 10 },
      { depotId: 2, value: 0 },
      { depotId: 3, value: 10 },
    ];
    const result = splitTotal(values, 100);
    // The sum should equal the total
    expect(result.reduce((sum, item) => sum + item.value, 0)).toBe(100);
    expect(new Set(result)).toEqual(
      new Set([
        { depotId: 1, value: 50 },
        { depotId: 2, value: 0 },
        { depotId: 3, value: 50 },
      ]),
    );
  });

  it("should handle uneven values", () => {
    const values = [
      { depotId: 1, value: 1 },
      { depotId: 2, value: 2 },
      { depotId: 3, value: 3 },
    ];
    const result = splitTotal(values, 100);
    // The sum should equal the total
    expect(result.reduce((sum, item) => sum + item.value, 0)).toBe(100);
    // Values should be roughly proportional
    const value1 = result.find((item) => item.depotId === 1)!.value;
    const value2 = result.find((item) => item.depotId === 2)!.value;
    const value3 = result.find((item) => item.depotId === 3)!.value;
    expect(value1).toBe(17);
    expect(value2).toBe(33);
    expect(value3).toBe(50);
  });

  it("should handle very small values", () => {
    const values = [
      { depotId: 1, value: 0.00015 },
      { depotId: 2, value: 0.00045 },
      { depotId: 3, value: 0.0002 },
    ];
    const result = splitTotal(values, 100);
    // The sum should equal the total
    expect(result.reduce((sum, item) => sum + item.value, 0)).toBe(100);
    // Values should be roughly proportional
    const value1 = result.find((item) => item.depotId === 1)!.value;
    const value2 = result.find((item) => item.depotId === 2)!.value;
    const value3 = result.find((item) => item.depotId === 3)!.value;
    expect(value1).toBe(19);
    expect(value2).toBe(56);
    expect(value3).toBe(25);
  });
});
