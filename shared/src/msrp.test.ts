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
} from "./types";
import { Unit, ProductCategoryType, UserCategory } from "./enum";

describe("calculateEffectiveMsrpChain", () => {
  // Product similar to Python example: base_msrp=100, frequency=12
  // In TypeScript: msrp=10000 (cents per piece), frequency=12
  const productId = 1;
  const product: ProductWithProductCategoryTyp = {
    id: productId,
    name: "Test Product",
    unit: Unit.PIECE,
    active: true,
    quantityMin: 0,
    quantityMax: 100,
    quantityStep: 0.1,
    frequency: 12,
    description: "Test Description",
    msrp: 10000, // 100 euros in cents
    quantity: 100,
    productCategoryId: 1,
    productCategoryType: ProductCategoryType.COOPERATION,
  };

  const productsById: ProductsById = {
    [productId]: product,
  };

  const contribution = UserCategory.CAT100;
  const depotId = 1;

  // Create orders matching Python example:
  // Order 1: amount=1, months=12, weight=1
  // Order 2: amount=0.5, months=7, weight=0.7
  // Order 3: amount=4.5, months=5, weight=0.2
  // Order 4: amount=0, months=4, weight=0.1
  const createOrder = (
    id: number,
    amount: number,
    months: number
  ): SavedOrder => {
    const baseDate = new Date("2024-01-01");
    return {
      id,
      orderItems: amount > 0 ? [{ productId, value: amount }] : [],
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

  const orders: SavedOrder[] = [
    createOrder(1, 1, 12),
    createOrder(2, 0.5, 7),
    createOrder(3, 4.5, 5),
    createOrder(4, 0, 4),
  ];

  // Create raw MSRP for each order
  const rawMsrpByOrderId: { [key: number]: Msrp } = {};
  const productMsrpWeightsByOrderId: {
    [key: number]: { [key: number]: number };
  } = {};

  // Define months for each order
  const orderMonths: { [key: number]: number } = {
    1: 12,
    2: 7,
    3: 5,
    4: 4,
  };

  orders.forEach((order) => {
    const weight =
      order.id === 1 ? 1 : order.id === 2 ? 0.7 : order.id === 3 ? 0.2 : 0.1;
    const months = orderMonths[order.id];

    productMsrpWeightsByOrderId[order.id] = {
      [productId]: weight,
    };

    // Calculate raw MSRP for this order
    const orderItems = order.orderItems;
    rawMsrpByOrderId[order.id] = getMsrp(
      contribution,
      orderItems,
      productsById,
      months,
      productMsrpWeightsByOrderId[order.id]
    );
  });

  it("should calculate effective MSRP chain for single product", () => {
    const results = calculateEffectiveMsrpChain(
      orders,
      rawMsrpByOrderId,
      productMsrpWeightsByOrderId,
      productsById
    );

    expect(results).toHaveLength(4);

    // Verify that results correspond 1:1 to orders
    results.forEach((result, index) => {
      expect(result.contribution).toBe(contribution);
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

    console.log("results", results);

    // All results should have valid MSRP values
    results.forEach((result) => {
      expect(result.monthly.total).toBeGreaterThanOrEqual(0);
      expect(result.monthly.selfgrown).toBeGreaterThanOrEqual(0);
      expect(result.monthly.cooperation).toBeGreaterThanOrEqual(0);
      expect(result.yearly.total).toBeGreaterThanOrEqual(0);
      expect(result.yearly.selfgrown).toBeGreaterThanOrEqual(0);
      expect(result.yearly.cooperation).toBeGreaterThanOrEqual(0);
    });
  });

  it("should handle empty orders array", () => {
    const results = calculateEffectiveMsrpChain([], {}, {}, productsById);

    expect(results).toHaveLength(0);
  });
});
