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
import {
  formatCommercialItemBezeichnung,
  getCommercialItemDisplayName,
} from "./itemDisplay";
import { CommercialDeliveryItem, ProductsById } from "../types";
import { Unit, ProductCategoryType } from "../enum";

const productsById: ProductsById = {
  1: {
    id: 1,
    name: "Radieschen",
    description: "",
    active: true,
    msrp: 100,
    frequency: 12,
    quantity: 1,
    quantityMin: 1,
    quantityMax: 10,
    quantityStep: 1,
    unit: Unit.WEIGHT,
    productCategoryId: 1,
    productCategoryType: ProductCategoryType.SELFGROWN,
    vatRate: 7,
  },
};

const catalogItem = (
  overrides: Partial<CommercialDeliveryItem> = {},
): CommercialDeliveryItem => ({
  productId: 1,
  productName: null,
  quantity: 1,
  unit: Unit.PIECE,
  conversionFrom: 1,
  conversionTo: 1,
  unitPriceCents: 100,
  vatRate: 7,
  isBio: true,
  description: null,
  ...overrides,
});

test("display name from catalog product", () => {
  expect(getCommercialItemDisplayName(catalogItem(), productsById)).toBe(
    "Radieschen",
  );
});

test("display name from free-text product", () => {
  expect(
    getCommercialItemDisplayName(
      catalogItem({ productId: null, productName: "Topfkräuter" }),
      productsById,
    ),
  ).toBe("Topfkräuter");
});

test("invoice bezeichnung includes bemerkung", () => {
  expect(
    formatCommercialItemBezeichnung(
      catalogItem({ description: "Bund" }),
      productsById,
      { includeDescription: true },
    ),
  ).toBe("Radieschen (Bund)");
});

test("delivery note bezeichnung includes bio suffix", () => {
  expect(
    formatCommercialItemBezeichnung(catalogItem(), productsById, {
      includeBioSuffix: true,
    }),
  ).toBe("Radieschen [Bio]");
});

test("bio suffix comes after bemerkung", () => {
  expect(
    formatCommercialItemBezeichnung(
      catalogItem({ description: "Bund" }),
      productsById,
      { includeDescription: true, includeBioSuffix: true },
    ),
  ).toBe("Radieschen (Bund) [Bio]");
});
