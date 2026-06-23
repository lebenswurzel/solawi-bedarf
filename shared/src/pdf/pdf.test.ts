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
  generateOverviewPdf,
  getMaxDepotsPerPage,
  LANDSCAPE_A4_WIDTH_PT,
  measureOverviewHeaderRowHeight,
  measureOverviewRowHeights,
  OVERVIEW_HORIZONTAL_MARGINS_PT,
  OVERVIEW_LABEL_WIDTH_PT,
  OVERVIEW_NUM_COL_WIDTH_PT,
  sliceTableByHeaders,
} from "./pdf";

const buildStyledBody = (rawTable: (string | number)[][]) => {
  const hasSummeColumn = rawTable[0]?.[1] === "Summe";
  return rawTable.map((row, rowIndex) =>
    row.map((cell, columnIndex) => {
      const base = { text: cell };
      if (rowIndex > 0 && columnIndex === 1 && hasSummeColumn) {
        return { ...base, margin: [0, 0, 0, 10] };
      }
      if (rowIndex === 0) {
        return { ...base, bold: true };
      }
      return columnIndex === 0 ? { ...base, fontSize: 10 } : base;
    })
  );
};

describe("measureOverviewRowHeights", () => {
  it("returns one height per row", () => {
    const body = buildStyledBody([
      ["Bezeichnung", "Summe", "Depot A"],
      ["Tomaten", 10, 3],
      ["Gurken", 5, 2],
    ]);

    const heights = measureOverviewRowHeights(body, [
      OVERVIEW_LABEL_WIDTH_PT,
      OVERVIEW_NUM_COL_WIDTH_PT,
      OVERVIEW_NUM_COL_WIDTH_PT,
    ]);

    expect(heights).toHaveLength(3);
    expect(heights[0]).toBeGreaterThan(heights[1]);
    expect(heights.every((h) => h > 0)).toBe(true);
  });

  it("produces taller height for a multi-line label than a single-line row", () => {
    const body = buildStyledBody([
      ["Bezeichnung", "Summe"],
      ["Tomaten", 10],
      ["Salat (Schnittsalat, lose) [BIO] [g]\nx1.05", 5],
    ]);

    const heights = measureOverviewRowHeights(body, [
      OVERVIEW_LABEL_WIDTH_PT,
      OVERVIEW_NUM_COL_WIDTH_PT,
    ]);

    expect(heights[2]).toBeGreaterThan(heights[1]);
  });

  it("matches pdfmake auto layout for a wide overview table", () => {
    const depots = [
      "Bezeichnung",
      "Summe",
      "Marios Garage",
      "VG Friedensstraße",
      "Gastro_Albergo",
    ];
    const body = buildStyledBody([
      depots,
      ["Blumenkohl [BIO] [Stk.]", 2, 0, 0, 0],
      ["Bohne [BIO] [g]\nx1.05", 100800, 0, 0, 0],
    ]);
    const widths = [100, ...new Array(depots.length - 1).fill(35)];

    const measured = measureOverviewRowHeights(body, widths);

    expect(measured[0]).toBeGreaterThan(40);
    expect(measured[0]).toBeLessThan(70);
    expect(measured[1]).toBeGreaterThan(15);
    expect(measured[1]).toBeLessThan(35);
    expect(measured[2]).toBeGreaterThanOrEqual(measured[1]);
  });
});

describe("measureOverviewHeaderRowHeight", () => {
  it("uses continuation header label when computing header row height", () => {
    const depots = Array.from({ length: 15 }, (_, i) => `Depot ${i + 1}`);
    const headers = ["Bezeichnung", "Summe", ...depots];
    const fullTable: (string | number)[][] = [
      headers,
      ["Tomaten", 10, ...depots.map(() => 1)],
    ];

    const chunks = chunkOverviewHeaders(headers, getMaxDepotsPerPage());
    const firstChunkHeight = measureOverviewRowHeights(
      buildStyledBody([sliceTableByHeaders(fullTable, chunks[0])[0]]),
      [
        OVERVIEW_LABEL_WIDTH_PT,
        ...new Array(chunks[0].length - 1).fill(OVERVIEW_NUM_COL_WIDTH_PT),
      ]
    )[0];

    const headerHeight = measureOverviewHeaderRowHeight(
      fullTable,
      chunks,
      buildStyledBody
    );

    expect(headerHeight).toBeGreaterThanOrEqual(firstChunkHeight);
  });
});

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
    expect(getMaxDepotsPerPage()).toBe(13);
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

describe("generateOverviewPdf", () => {
  it("generates a multi-page overview PDF without error", async () => {
    const depots = Array.from({ length: 15 }, (_, i) => `Depot ${i + 1}`);
    const data: { [key: string]: { [key: string]: number } } = {
      "Tomaten [BIO] [Stk.]": {
        Summe: 3,
        ...Object.fromEntries(depots.map((d, i) => [d, i % 3 === 0 ? 1 : 0])),
      },
      "Salat (Schnittsalat, lose) [BIO] [g]\nx1.05": {
        Summe: 15,
        ...Object.fromEntries(depots.map((d) => [d, 1])),
      },
    };

    const pdf = generateOverviewPdf(data, "Test overview", "Test footer");

    const buffer: Buffer = await new Promise((resolve, reject) => {
      pdf.getBuffer((buf: Buffer, err?: Error) => {
        if (err) reject(err);
        else resolve(buf);
      });
    });

    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});
