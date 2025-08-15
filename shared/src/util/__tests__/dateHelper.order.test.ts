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
import { describe, expect, it } from "vitest";
import {
  calculateNewOrderValidFromDate,
  calculatePreviousOrderValidToDate,
} from "../dateHelper";

describe("Order date calculations", () => {
  it("should calculate new order validFrom date correctly", () => {
    // End bidding round: March 15, 2024
    const endBiddingRound = new Date(2024, 2, 15); // March is month 2 (0-indexed)

    // Should return Friday before first Thursday of April 2024
    // April 1, 2024 is a Monday
    // First Thursday of April 2024 is April 4
    // Friday before that is March 29, 2024
    const validFrom = calculateNewOrderValidFromDate(endBiddingRound);

    expect(validFrom.getFullYear()).toBe(2024);
    expect(validFrom.getMonth()).toBe(2); // March (0-indexed)
    expect(validFrom.getDate()).toBe(29);
    expect(validFrom.getDay()).toBe(5); // Friday
  });

  it("should calculate previous order validTo date correctly", () => {
    const newOrderValidFrom = new Date(2024, 2, 29); // March 29, 2024

    // Should return 23:59:59.999 of March 28, 2024
    const validTo = calculatePreviousOrderValidToDate(newOrderValidFrom);

    expect(validTo.getFullYear()).toBe(2024);
    expect(validTo.getMonth()).toBe(2); // March (0-indexed)
    expect(validTo.getDate()).toBe(28);
    expect(validTo.getHours()).toBe(23);
    expect(validTo.getMinutes()).toBe(59);
    expect(validTo.getSeconds()).toBe(59);
    expect(validTo.getMilliseconds()).toBe(999);
  });

  it("should handle edge case when first day of month is Thursday", () => {
    // End bidding round: March 15, 2024
    // May 1, 2024 is a Wednesday
    // First Thursday of May 2024 is May 2
    // Friday before that is April 26, 2024
    const endBiddingRound = new Date(2024, 3, 15); // April 15, 2024

    const validFrom = calculateNewOrderValidFromDate(endBiddingRound);

    expect(validFrom.getFullYear()).toBe(2024);
    expect(validFrom.getMonth()).toBe(3); // April (0-indexed)
    expect(validFrom.getDate()).toBe(26);
    expect(validFrom.getDay()).toBe(5); // Friday
  });
});
