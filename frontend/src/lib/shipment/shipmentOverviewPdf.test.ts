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
import { grouping } from "@lebenswurzel/solawi-bedarf-shared/src/util/utils";
import {
  ProductCategoryWithProducts,
  ProductsById,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { createShipmentOverviewPdfSpec } from "./shipmentOverviewPdf.ts";

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

describe("create shipment overview pdfs", () => {
  test("for all product categories", () => {
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

    const depot1 = genDepot();
    const depot2 = genDepot({ name: "Depot 2" });
    const depot3 = genDepot({ name: "Depot 3" });

    const shipment = genShipment({
      shipmentItems: [
        genShipmentItem(tomato, depot1, { totalShipedQuantity: 5000 }),
        genShipmentItem(cucumber, depot1, { totalShipedQuantity: 5 }),
        genShipmentItem(milk, depot1, { totalShipedQuantity: 7000 }),

        genShipmentItem(tomato, depot2, { totalShipedQuantity: 10000 }),
        genShipmentItem(cucumber, depot2, { totalShipedQuantity: 10 }),

        genShipmentItem(tomato, depot3, { totalShipedQuantity: 3000 }),
        genShipmentItem(milk, depot3, { totalShipedQuantity: 500 }),
      ],
    });

    // ACT
    const actual = createShipmentOverviewPdfSpec(
      shipment,
      [depot1, depot2, depot3],
      productsById,
      productCategories,
    );

    // ASSERT
    expect(Object.keys(actual)).toEqual([VEGETABLES.name, MILK_PRODUCTS.name]);
    expect(actual[VEGETABLES.name]).toStrictEqual({
      "Cucumber [BIO] [Stk.]": {
        "Depot 2": 10,
        "Main depot": 5,
        Summe: 15,
      },
      "Tomato [BIO] [g]": {
        "Depot 2": 10000,
        "Depot 3": 3000,
        "Main depot": 5000,
        Summe: 18000,
      },
    });

    expect(actual[MILK_PRODUCTS.name]).toStrictEqual({
      "Milk [BIO] [ml]": {
        "Depot 3": 500,
        "Main depot": 7000,
        Summe: 7500,
      },
    });
  });
});
