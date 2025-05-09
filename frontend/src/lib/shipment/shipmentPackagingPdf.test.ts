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
} from "@lebenswurzel/solawi-bedarf-shared/testSetup";
import {
  createShipmentPackagingPdfSpecs,
  formatQuantityChange,
} from "./shipmentPackagingPdf.ts";
import {
  ProductCategoryWithProducts,
  ProductsById,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { Unit } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { grouping } from "@lebenswurzel/solawi-bedarf-shared/src/util/utils";

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
        headers: ["Menge", "Bezeichnung", "Bemerkung"],
        widths: ["15%", "50%", "35%"],
        rows: [
          ["5 Stk.", CUCUMBER.name + " [BIO]", ""],
          ["5000 g", TOMATO.name + " [BIO]", ""],
        ],
      },
      {
        name: MILK_PRODUCTS.name,
        headers: ["Menge", "Bezeichnung", "Bemerkung"],
        widths: ["15%", "50%", "35%"],
        rows: [["7000 ml", MILK.name + " [BIO]", ""]],
      },
    ]);
  });
});

describe("format quantity change", () => {
  test("of no change", () => {
    // ARRANGE
    const product = genProduct(TOMATO);
    const item = genShipmentItem(product, genDepot());

    // ACT
    const actual = formatQuantityChange(item, product);

    // ASSERT
    expect(actual).toBe("");
  });

  test("of 2x", () => {
    // ARRANGE
    const product = genProduct(TOMATO);
    const item = genShipmentItem(product, genDepot(), {
      multiplicator: 200,
    });

    // ACT
    const actual = formatQuantityChange(item, product);

    // ASSERT
    expect(actual).toBe("2x");
  });

  test("of 0.5x", () => {
    // ARRANGE
    const product = genProduct(TOMATO);
    const item = genShipmentItem(product, genDepot(), {
      multiplicator: 50,
    });

    // ACT
    const actual = formatQuantityChange(item, product);

    // ASSERT
    expect(actual).toBe("0,5x");
  });

  test("of (1 Stk. -> 100 g)", () => {
    // ARRANGE
    const product = genProduct(CUCUMBER);
    const item = genShipmentItem(product, genDepot(), {
      conversionFrom: 1,
      conversionTo: 100,
      unit: Unit.WEIGHT,
    });

    // ACT
    const actual = formatQuantityChange(item, product);

    // ASSERT
    expect(actual).toBe("1 Stk. -> 100 g");
  });

  test("of 2x (1 Stk. -> 100 g)", () => {
    // ARRANGE
    const product = genProduct(CUCUMBER);
    const item = genShipmentItem(product, genDepot(), {
      multiplicator: 200,
      conversionFrom: 1,
      conversionTo: 100,
      unit: Unit.WEIGHT,
    });

    // ACT
    const actual = formatQuantityChange(item, product);

    // ASSERT
    expect(actual).toBe("1 Stk. -> 200 g");
  });

  test("of 1 Stk. -> 2 Stk.", () => {
    // e.g., if two small cucumbers count as one
    // ARRANGE
    const product = genProduct(CUCUMBER);
    const item = genShipmentItem(product, genDepot(), {
      conversionFrom: 1,
      conversionTo: 2,
      unit: Unit.PIECE,
    });

    // ACT
    const actual = formatQuantityChange(item, product);

    // ASSERT
    expect(actual).toBe("1 Stk. -> 2 Stk.");
  });
});
