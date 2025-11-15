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
import { describe, it, expect } from "vitest";
import { calculateEffectiveMsrpChain, getMsrp } from "./msrp";
import {
  SavedOrder,
  ProductsById,
  ProductWithProductCategoryTyp,
  Msrp,
  OrderItem,
} from "./types";
import { Unit, ProductCategoryType, UserCategory } from "./enum";

describe("calculateEffectiveMsrpChain", () => {
  const depotId = 1;
  const baseDate = new Date("2024-01-01");

  // Helper function to create a product
  const createProduct = (
    id: number,
    name: string,
    msrp: number,
    frequency: number,
    categoryType: ProductCategoryType
  ): ProductWithProductCategoryTyp => {
    return {
      id,
      name,
      unit: Unit.PIECE,
      active: true,
      quantityMin: 0,
      quantityMax: 100,
      quantityStep: 0.1,
      frequency,
      description: `Test Description for ${name}`,
      msrp, // in cents
      quantity: 100,
      productCategoryId: id,
      productCategoryType: categoryType,
    };
  };

  // Helper function to create an order
  const createOrder = (
    id: number,
    orderItems: OrderItem[],
    months: number,
    contribution: UserCategory = UserCategory.CAT100
  ): SavedOrder => {
    return {
      id,
      orderItems,
      depotId,
      alternateDepotId: null,
      offer: 0,
      offerReason: null,
      category: contribution,
      categoryReason: null,
      validFrom: baseDate,
      validTo: new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() + months,
        baseDate.getDate()
      ),
      requisitionConfigId: 1,
      confirmGTC: true,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString(),
    };
  };

  // Helper function to prepare MSRP data for orders
  const prepareMsrpData = (
    orders: SavedOrder[],
    productsById: ProductsById,
    orderMonths: { [key: number]: number },
    productWeightsByOrderId: {
      [key: number]: { [key: number]: number };
    }
  ): {
    rawMsrpByOrderId: { [key: number]: Msrp };
    productMsrpWeightsByOrderId: {
      [key: number]: { [key: number]: number };
    };
  } => {
    const rawMsrpByOrderId: { [key: number]: Msrp } = {};
    const productMsrpWeightsByOrderId: {
      [key: number]: { [key: number]: number };
    } = {};

    orders.forEach((order) => {
      const months = orderMonths[order.id];
      const weights = productWeightsByOrderId[order.id] || {};

      productMsrpWeightsByOrderId[order.id] = weights;

      rawMsrpByOrderId[order.id] = getMsrp(
        order.category,
        order.orderItems,
        productsById,
        months,
        weights
      );
    });

    return { rawMsrpByOrderId, productMsrpWeightsByOrderId };
  };

  it("should calculate effective MSRP chain for single product", () => {
    // Product similar to Python example: base_msrp=100, frequency=12
    // In TypeScript: msrp=10000 (cents per piece), frequency=12
    const productId = 1;
    const product = createProduct(
      productId,
      "Test Product",
      10000, // 100 euros in cents
      12,
      ProductCategoryType.COOPERATION
    );

    const productsById: ProductsById = {
      [productId]: product,
    };

    // Create orders matching Python example:
    // Order 1: amount=1, months=12, weight=1
    // Order 2: amount=0.5, months=7, weight=0.7
    // Order 3: amount=4.5, months=5, weight=0.2
    // Order 4: amount=0, months=4, weight=0.1
    const orders: SavedOrder[] = [
      createOrder(1, [{ productId, value: 1 }], 12),
      createOrder(2, [{ productId, value: 0.5 }], 7),
      createOrder(3, [{ productId, value: 4.5 }], 5),
      createOrder(4, [], 4, UserCategory.CAT130), // category should not matter for empty orders
    ];

    // Define months for each order
    const orderMonths: { [key: number]: number } = {
      1: 12,
      2: 7,
      3: 5,
      4: 4,
    };

    // Define weights for each order
    const productWeightsByOrderId: {
      [key: number]: { [key: number]: number };
    } = {
      1: { [productId]: 1 },
      2: { [productId]: 0.7 },
      3: { [productId]: 0.2 },
      4: { [productId]: 0.1 },
    };

    const { rawMsrpByOrderId, productMsrpWeightsByOrderId } = prepareMsrpData(
      orders,
      productsById,
      orderMonths,
      productWeightsByOrderId
    );

    const results = calculateEffectiveMsrpChain(
      orders,
      rawMsrpByOrderId,
      productMsrpWeightsByOrderId,
      productsById
    );

    expect(results).toHaveLength(4);

    // Verify that results correspond 1:1 to orders
    results.forEach((result, index) => {
      expect(result.contribution).toBe(orders[index].category);
      expect(result.months).toBe(orderMonths[orders[index].id]);
    });

    // The first order should have the base monthly MSRP
    // For amount=1, frequency=12, msrp=10000 (100€ in cents):
    // Yearly base MSRP = (12 * 10000 * 1) / 100 = 1200€
    // Monthly base MSRP = 1200 / 12 = 100€
    // With CAT100 (100% = 1.0), adjusted = 100€
    const firstResult = results[0];
    expect(firstResult.monthly.total).toBeGreaterThan(0);
    expect(firstResult.yearly.total).toBeGreaterThan(0);

    // All results should have valid MSRP values
    results.forEach((result) => {
      expect(result.monthly.total).toBeGreaterThanOrEqual(0);
      expect(result.monthly.selfgrown).toBeGreaterThanOrEqual(0);
      expect(result.monthly.cooperation).toBeGreaterThanOrEqual(0);
      expect(result.yearly.total).toBeGreaterThanOrEqual(0);
      expect(result.yearly.selfgrown).toBeGreaterThanOrEqual(0);
      expect(result.yearly.cooperation).toBeGreaterThanOrEqual(0);
    });

    expect(results[0].monthly.total).toBe(100);
    expect(results[1].monthly.total).toBe(40);
    expect(results[2].monthly.total).toBe(232);
    expect(results[3].monthly.total).toBe(97);
  });

  it("should calculate effective MSRP chain for multiple products", () => {
    // Create 3 products: 1 COOPERATION, 2 SELFGROWN
    const productCoopId = 1;
    const productSelfgrown1Id = 2;
    const productSelfgrown2Id = 3;

    const productCoop = createProduct(
      productCoopId,
      "Cooperation Product",
      10000, // 100 euros in cents
      12,
      ProductCategoryType.COOPERATION
    );

    const productSelfgrown1 = createProduct(
      productSelfgrown1Id,
      "Selfgrown Product 1",
      15000, // 150 euros in cents
      12,
      ProductCategoryType.SELFGROWN
    );

    const productSelfgrown2 = createProduct(
      productSelfgrown2Id,
      "Selfgrown Product 2",
      8000, // 80 euros in cents
      12,
      ProductCategoryType.SELFGROWN
    );

    const productsById: ProductsById = {
      [productCoopId]: productCoop,
      [productSelfgrown1Id]: productSelfgrown1,
      [productSelfgrown2Id]: productSelfgrown2,
    };

    // Create 3 orders:
    // Order 1: all 3 products
    // Order 2: COOPERATION + SELFGROWN1 (SELFGROWN2 missing)
    // Order 3: all 3 products again
    const orders: SavedOrder[] = [
      createOrder(
        1,
        [
          { productId: productCoopId, value: 1 },
          { productId: productSelfgrown1Id, value: 2 },
          { productId: productSelfgrown2Id, value: 1.5 },
        ],
        12
      ),
      createOrder(
        2,
        [
          { productId: productCoopId, value: 0.8 },
          { productId: productSelfgrown1Id, value: 1.5 },
        ],
        8
      ),
      createOrder(
        3,
        [
          { productId: productCoopId, value: 1.2 },
          { productId: productSelfgrown1Id, value: 2.5 },
          { productId: productSelfgrown2Id, value: 2 },
        ],
        6
      ),
    ];

    // Define months for each order
    const orderMonths: { [key: number]: number } = {
      1: 12,
      2: 8,
      3: 6,
    };

    // Define weights for each product in each order
    // Note: Even if a product doesn't appear in an order, we should provide its weight
    // (typically the same as the previous order's weight if the product is missing)
    const productWeightsByOrderId: {
      [key: number]: { [key: number]: number };
    } = {
      1: {
        [productCoopId]: 1.0,
        [productSelfgrown1Id]: 1.0,
        [productSelfgrown2Id]: 1.0,
      },
      2: {
        [productCoopId]: 0.7,
        [productSelfgrown1Id]: 0.6,
        [productSelfgrown2Id]: 1.0, // Product not in order 2, but weight stays at previous value
      },
      3: {
        [productCoopId]: 0.4,
        [productSelfgrown1Id]: 0.3,
        [productSelfgrown2Id]: 0.5,
      },
    };

    const { rawMsrpByOrderId, productMsrpWeightsByOrderId } = prepareMsrpData(
      orders,
      productsById,
      orderMonths,
      productWeightsByOrderId
    );

    const results = calculateEffectiveMsrpChain(
      orders,
      rawMsrpByOrderId,
      productMsrpWeightsByOrderId,
      productsById
    );

    expect(results).toHaveLength(3);

    // Verify that results correspond 1:1 to orders
    results.forEach((result, index) => {
      expect(result.contribution).toBe(orders[index].category);
      expect(result.months).toBe(orderMonths[orders[index].id]);
    });

    // Verify all results have valid MSRP values
    results.forEach((result) => {
      expect(result.monthly.total).toBeGreaterThanOrEqual(0);
      expect(result.monthly.selfgrown).toBeGreaterThanOrEqual(0);
      expect(result.monthly.cooperation).toBeGreaterThanOrEqual(0);
      expect(result.yearly.total).toBeGreaterThanOrEqual(0);
      expect(result.yearly.selfgrown).toBeGreaterThanOrEqual(0);
      expect(result.yearly.cooperation).toBeGreaterThanOrEqual(0);
    });

    console.log("results", results);
    // Verify that selfgrown and cooperation values are correctly separated
    results.forEach((result) => {
      expect(result.monthly.total).toBe(
        result.monthly.selfgrown +
          result.monthly.cooperation +
          (result.monthly.selfgrownCompensation ?? 0)
      );
      expect(result.yearly.total).toBe(
        result.yearly.selfgrown +
          result.yearly.cooperation +
          (result.yearly.selfgrownCompensation ?? 0)
      );
    });

    // First order should have all products
    expect(results[0].monthly.selfgrown).toBeGreaterThan(0);
    expect(results[0].monthly.cooperation).toBeGreaterThan(0);

    // Second order should have cooperation and one selfgrown (but not the other)
    expect(results[1].monthly.cooperation).toBeGreaterThan(0);
    expect(results[1].monthly.selfgrown).toBeGreaterThan(0);

    // Third order should have all products again
    expect(results[2].monthly.selfgrown).toBeGreaterThan(0);
    expect(results[2].monthly.cooperation).toBeGreaterThan(0);
  });

  it("should handle empty orders array", () => {
    const productId = 1;
    const product = createProduct(
      productId,
      "Test Product",
      10000,
      12,
      ProductCategoryType.COOPERATION
    );

    const productsById: ProductsById = {
      [productId]: product,
    };

    const results = calculateEffectiveMsrpChain([], {}, {}, productsById);

    expect(results).toHaveLength(0);
  });
});
