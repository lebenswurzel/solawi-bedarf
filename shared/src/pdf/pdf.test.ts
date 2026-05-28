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
  chunkOverviewHeaders,
  getMaxDepotsPerPage,
  LANDSCAPE_A4_WIDTH_PT,
  OVERVIEW_HORIZONTAL_MARGINS_PT,
  OVERVIEW_LABEL_WIDTH_PT,
  OVERVIEW_NUM_COL_WIDTH_PT,
  sliceTableByHeaders,
} from "./pdf";

describe("getMaxDepotsPerPage", () => {
  it("computes depot columns that fit on landscape A4", () => {
    const availableWidth =
      LANDSCAPE_A4_WIDTH_PT - OVERVIEW_HORIZONTAL_MARGINS_PT;
    expect(getMaxDepotsPerPage()).toBe(
      Math.max(
        1,
        Math.floor(
          (availableWidth - OVERVIEW_LABEL_WIDTH_PT) / OVERVIEW_NUM_COL_WIDTH_PT
        ) - 1
      )
    );
    expect(getMaxDepotsPerPage()).toBe(11);
  });
});

describe("chunkOverviewHeaders", () => {
  it("keeps Summe only on the first chunk", () => {
    const depots = Array.from({ length: 20 }, (_, i) => `Depot ${i + 1}`);
    const headers = ["Bezeichnung", "Summe", ...depots];
    const chunks = chunkOverviewHeaders(headers, 14);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual(["Bezeichnung", "Summe", ...depots.slice(0, 14)]);
    expect(chunks[1]).toEqual(["Bezeichnung", ...depots.slice(14, 20)]);
  });

  it("returns a single chunk when there are no depot columns", () => {
    const headers = ["Bezeichnung", "Summe"];
    expect(chunkOverviewHeaders(headers, 14)).toEqual([headers]);
  });
});

describe("sliceTableByHeaders", () => {
  it("keeps cell values for the selected columns", () => {
    const fullTable: (string | number)[][] = [
      ["Bezeichnung", "Summe", "Depot A", "Depot B"],
      ["Tomaten", 10, 3, 7],
    ];
    const sliced = sliceTableByHeaders(fullTable, [
      "Bezeichnung",
      "Summe",
      "Depot B",
    ]);

    expect(sliced).toEqual([
      ["Bezeichnung", "Summe", "Depot B"],
      ["Tomaten", 10, 7],
    ]);
  });
});
