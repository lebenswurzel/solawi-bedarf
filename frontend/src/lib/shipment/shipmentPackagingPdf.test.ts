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
} from "../../../testSetup.ts";
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
