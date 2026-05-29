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
import { Unit } from "../enum";
import {
  formatCentsAsEuro,
  getDefaultUnitPriceCents,
  getDeliveryTotals,
  getLineGrossCents,
  getLineTotals,
  isValidVatRate,
  splitGrossIntoNetAndVat,
} from "./pricing";
import { CommercialDeliveryItem, Product } from "../types";

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 1,
  name: "Tomaten",
  description: "",
  active: true,
  msrp: 350,
  frequency: 12,
  quantity: 1,
  quantityMin: 1,
  quantityMax: 10,
  quantityStep: 1,
  unit: Unit.WEIGHT,
  productCategoryId: 1,
  vatRate: 7,
  ...overrides,
});

const item = (
  overrides: Partial<CommercialDeliveryItem> = {},
): CommercialDeliveryItem => ({
  productId: 1,
  quantity: 2000,
  unit: Unit.WEIGHT,
  conversionFrom: 1,
  conversionTo: 1,
  unitPriceCents: 350,
  vatRate: 7,
  isBio: true,
  description: null,
  ...overrides,
});

test("default unit price uses engagiert msrp", () => {
  expect(getDefaultUnitPriceCents(product())).toBe(350);
});

test("line gross for weight in grams", () => {
  expect(getLineGrossCents(item({ quantity: 2000, unitPriceCents: 350 }))).toBe(
    700,
  );
});

test("line gross for pieces", () => {
  expect(
    getLineGrossCents(
      item({
        quantity: 5,
        unit: Unit.PIECE,
        unitPriceCents: 120,
      }),
    ),
  ).toBe(600);
});

test("split gross into net and vat at 7%", () => {
  const split = splitGrossIntoNetAndVat(1070, 7);
  expect(split.netCents + split.vatCents).toBe(1070);
  expect(split.vatCents).toBeGreaterThan(0);
});

test("delivery totals aggregate by vat rate", () => {
  const totals = getDeliveryTotals([
    item({ quantity: 1000, unitPriceCents: 200, vatRate: 7 }),
    item({ quantity: 2, unit: Unit.PIECE, unitPriceCents: 100, vatRate: 19 }),
  ]);
  expect(totals.grossCents).toBe(200 + 200);
  expect(totals.vatByRate[7].vatCents + totals.vatByRate[19].vatCents).toBe(
    totals.vatCents,
  );
});

test("line totals for 19 percent vat", () => {
  const totals = getLineTotals(item({ unitPriceCents: 1190, quantity: 1, unit: Unit.PIECE, vatRate: 19 }));
  expect(totals.grossCents).toBe(1190);
  expect(totals.netCents).toBeLessThan(totals.grossCents);
});

test("format cents as euro", () => {
  expect(formatCentsAsEuro(1234)).toContain("12");
});

test("valid vat rates", () => {
  expect(isValidVatRate(7)).toBe(true);
  expect(isValidVatRate(19)).toBe(true);
  expect(isValidVatRate(16)).toBe(false);
});
