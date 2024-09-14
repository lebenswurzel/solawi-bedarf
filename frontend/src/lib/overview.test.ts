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
  generateDepotData,
  generateUserData,
  OverviewItem,
} from "./overview.ts";
import { Product } from "../../../shared/src/types.ts";
import { UserCategory } from "../../../shared/src/enum.ts";
import { PdfTable } from "./pdf/pdf.ts";
import {
  CUCUMBER,
  genProduct,
  genProductGroupWithProducts,
  MILK,
  MILK_PRODUCTS,
  TOMATO,
  VEGETABLES,
} from "../../testSetup.ts";

function genOrder(overwrite: Partial<OverviewItem> = {}): OverviewItem {
  const base: OverviewItem = {
    name: "Order",
    depot: "Main depot",
    alternateDepot: "Alt depot",
    msrp: 0,
    offer: 100,
    offerReason: "",
    category: UserCategory.CAT115,
    categoryReason: "Just do it :)",
    items: [],
  };
  return { ...base, ...overwrite };
}

function genOrderItem(product: Product, value: number) {
  return {
    name: product.name,
    value,
    unit: product.unit,
    category: product.productCategoryId,
  };
}

// test generateUserData
describe("summarize demand by user", () => {
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

    let productCategories = [vegetables, mil_products];

    let orders = [
      genOrder({
        name: "Order",
        depot: "Main depot",
        items: [
          genOrderItem(tomato, 200),
          genOrderItem(cucumber, 3),
          genOrderItem(milk, 3000),
        ],
      }),
    ];

    // ACT
    let actual = generateUserData(orders, productCategories);

    // ASSERT
    expect(actual.length).toBe(1);
    expect(actual[0].tables).toStrictEqual([
      {
        name: VEGETABLES.name,
        headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
        widths: ["70%", "10%", "20%"],
        rows: [
          [CUCUMBER.name, "3 Stk.", "20 x"],
          [TOMATO.name, "200 g", "30 x"],
        ],
      },
      {
        name: MILK_PRODUCTS.name,
        headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
        widths: ["70%", "10%", "20%"],
        rows: [[MILK.name, "3000 ml", "56 x"]],
      },
    ]);
  });

  test("for multiple orders", () => {
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

    let productCategories = [vegetables, mil_products];

    let orders = [
      genOrder({
        name: "Order1",
        depot: "Main depot",
        items: [genOrderItem(tomato, 200), genOrderItem(milk, 3000)],
      }),
      genOrder({
        name: "Order2",
        depot: "Main depot",
        items: [genOrderItem(cucumber, 3), genOrderItem(milk, 1000)],
      }),
    ];

    // ACT
    let actual = generateUserData(orders, productCategories);

    // ASSERT
    expect(actual.length).toBe(2);
    expect(actual[0].receiver).toEqual("Order1\nMain depot");
    expect(actual[0].tables).toEqual([
      {
        name: VEGETABLES.name,
        headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
        widths: ["70%", "10%", "20%"],
        rows: [[TOMATO.name, "200 g", "30 x"]],
      },
      {
        name: MILK_PRODUCTS.name,
        headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
        widths: ["70%", "10%", "20%"],
        rows: [[MILK.name, "3000 ml", "56 x"]],
      },
    ]);
    expect(actual[1].receiver).toEqual("Order2\nMain depot");
    expect(actual[1].tables).toEqual([
      {
        name: VEGETABLES.name,
        headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
        widths: ["70%", "10%", "20%"],
        rows: [[CUCUMBER.name, "3 Stk.", "20 x"]],
      },
      {
        name: MILK_PRODUCTS.name,
        headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
        widths: ["70%", "10%", "20%"],
        rows: [[MILK.name, "1000 ml", "56 x"]],
      },
    ]);
  });

  test("while ignoring empty items", () => {
    // ARRANGE
    const tomato = genProduct(TOMATO);
    const vegetables = genProductGroupWithProducts({
      name: VEGETABLES.name,
      products: [tomato],
    });

    let productCategories = [vegetables];

    let orders = [
      genOrder({
        name: "Order",
        depot: "Main depot",
        items: [genOrderItem(tomato, 0)],
      }),
    ];

    // ACT
    let actual = generateUserData(orders, productCategories);

    // ASSERT
    expect(actual.length).toBe(0);
  });
});

// test generateDepotData
describe("summarize demand by depot", () => {
  test("for single depot", () => {
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

    let productCategories = [vegetables, mil_products];

    let orders = [
      genOrder({
        name: "1",
        depot: "Main depot",
        items: [
          genOrderItem(tomato, 200),
          genOrderItem(cucumber, 3),
          genOrderItem(milk, 3000),
        ],
      }),
      genOrder({
        name: "2",
        depot: "Main depot",
        items: [
          genOrderItem(tomato, 100),
          genOrderItem(cucumber, 2),
          genOrderItem(milk, 7000),
        ],
      }),
    ];

    // ACT
    let actual = generateDepotData(orders, productCategories);

    // ASSERT
    expect(actual.length).toBe(1);
    expect(actual[0].tables).toStrictEqual([
      {
        name: VEGETABLES.name,
        headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
        widths: ["70%", "10%", "20%"],
        rows: [
          [CUCUMBER.name, "5 Stk.", "20 x"],
          [TOMATO.name, "300 g", "30 x"],
        ],
      },
      {
        name: MILK_PRODUCTS.name,
        headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
        widths: ["70%", "10%", "20%"],
        rows: [[MILK.name, "10000 ml", "56 x"]],
      },
    ]);
  });

  test("for multiple depots", () => {
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

    let productCategories = [vegetables, mil_products];

    let orders = [
      genOrder({
        name: "1",
        depot: "01 Main depot",
        items: [genOrderItem(tomato, 200), genOrderItem(milk, 3000)],
      }),
      genOrder({
        name: "2",
        depot: "02 Alt depot",
        items: [genOrderItem(cucumber, 3), genOrderItem(milk, 1000)],
      }),
    ];

    // ACT
    let actual = generateDepotData(orders, productCategories);

    // ASSERT
    expect(actual.length).toBe(2);
    expect(actual[0].receiver).toEqual("01 Main depot");
    expect(actual[0].tables).toEqual([
      {
        name: VEGETABLES.name,
        headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
        widths: ["70%", "10%", "20%"],
        rows: [[TOMATO.name, "200 g", "30 x"]],
      },
      {
        name: MILK_PRODUCTS.name,
        headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
        widths: ["70%", "10%", "20%"],
        rows: [[MILK.name, "3000 ml", "56 x"]],
      },
    ]);
    expect(actual[1].receiver).toEqual("02 Alt depot");
    expect(actual[1].tables).toEqual([
      {
        name: VEGETABLES.name,
        headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
        widths: ["70%", "10%", "20%"],
        rows: [[CUCUMBER.name, "3 Stk.", "20 x"]],
      },
      {
        name: MILK_PRODUCTS.name,
        headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
        widths: ["70%", "10%", "20%"],
        rows: [[MILK.name, "1000 ml", "56 x"]],
      },
    ]);
  });

  test("while ignoring empty items", () => {
    // ARRANGE
    const tomato = genProduct(TOMATO);
    const vegetables = genProductGroupWithProducts({
      name: VEGETABLES.name,
      products: [tomato],
    });

    let productCategories = [vegetables];

    let orders = [
      genOrder({
        name: "Order",
        depot: "Main depot",
        items: [genOrderItem(tomato, 0)],
      }),
    ];

    // ACT
    let actual = generateDepotData(orders, productCategories);

    // ASSERT
    expect(actual.length).toBe(0);
  });
});
