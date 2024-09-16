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
import { describe, expect, test } from "vitest";
import {
  CUCUMBER,
  genDepot,
  genProduct,
  genProductGroupWithProducts,
  genShipment,
  genShipmentItem,
  MILK,
  MILK_PRODUCTS,
  TOMATO,
  VEGETABLES,
} from "../../testSetup.ts";
import { createShipmentPackagingPdfSpecs } from "./shipmentPackagingPdf.ts";
import { grouping } from "../utils.ts";
import {
  ProductCategoryWithProducts,
  ProductsById,
} from "../../../../shared/src/types.ts";

function getProductsById(
  productCategories: ProductCategoryWithProducts[],
): ProductsById {
  return Object.fromEntries(
    productCategories
      .flatMap((x) => x.products)
      .reduce(
        grouping(
          (v) => v.id,
          (v) => v,
        ),
        new Map(),
      ),
  );
}

describe("create shipment pdfs", () => {
  test("for single order", () => {
    // ARRANGE
    const tomato = genProduct(TOMATO);
    const cucumber = genProduct(CUCUMBER);
    const vegetables = genProductGroupWithProducts({
      name: VEGETABLES.name,
      products: [tomato, cucumber],
    });

    const milk = genProduct(MILK);
    const mil_products = genProductGroupWithProducts({
      name: MILK_PRODUCTS.name,
      products: [milk],
    });

    const productCategories = [vegetables, mil_products];
    const productsById = getProductsById(productCategories);

    const depot = genDepot();

    const shipment = genShipment({
      shipmentItems: [
        genShipmentItem(tomato, depot, { totalShipedQuantity: 5000 }),
        genShipmentItem(cucumber, depot, { totalShipedQuantity: 5 }),
        genShipmentItem(milk, depot, { totalShipedQuantity: 7000 }),
      ],
    });

    // ACT
    const actual = createShipmentPackagingPdfSpecs(
      shipment,
      [depot],
      productsById,
      productCategories,
    );

    // ASSERT
    expect(actual.length).toBe(1);
    expect(actual[0].tables).toStrictEqual([
      {
        name: VEGETABLES.name,
        headers: ["Bezeichnung", "Menge", "Bemerkung"],
        widths: ["50%", "15%", "35%"],
        rows: [
          [CUCUMBER.name + " [BIO]", "5 Stk.", ""],
          [TOMATO.name + " [BIO]", "5000 g", ""],
        ],
      },
      {
        name: MILK_PRODUCTS.name,
        headers: ["Bezeichnung", "Menge", "Bemerkung"],
        widths: ["50%", "15%", "35%"],
        rows: [[MILK.name + " [BIO]", "7000 ml", ""]],
      },
    ]);
  });
});
