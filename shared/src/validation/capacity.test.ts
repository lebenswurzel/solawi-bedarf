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
import { checkOrderItemValid } from "./capacity";
import { OrderItem, ProductWithProductCategoryTyp } from "../types";
import { Unit, ProductCategoryType } from "../enum";

describe("checkOrderItemValid", () => {
  const mockProduct: ProductWithProductCategoryTyp = {
    id: 1,
    name: "Test Product",
    unit: Unit.WEIGHT,
    active: true,
    quantityMin: 5,
    quantityMax: 20,
    quantityStep: 1,
    frequency: 1,
    description: "Test Description",
    msrp: 10,
    quantity: 100,
    productCategoryId: 1,
    productCategoryType: ProductCategoryType.SELFGROWN,
  };

  const mockSoldByProductId = {
    1: {
      quantity: 100,
      sold: 50,
      frequency: 1,
      soldForShipment: 0,
    },
  };

  const mockProductsById = {
    1: mockProduct,
  };

  it("should return null for valid order item", () => {
    const orderItem: OrderItem = { value: 10, productId: 1 };
    const result = checkOrderItemValid(
      null,
      orderItem,
      mockSoldByProductId,
      mockProductsById
    );
    expect(result).toBeNull();
  });

  it("should return null for zero value", () => {
    const orderItem: OrderItem = { value: 0, productId: 1 };
    const result = checkOrderItemValid(
      null,
      orderItem,
      mockSoldByProductId,
      mockProductsById
    );
    expect(result).toBeNull();
  });

  it("should return error for inactive product", () => {
    const inactiveProduct = { ...mockProduct, active: false };
    const productsById = { ...mockProductsById, 1: inactiveProduct };
    const orderItem: OrderItem = { value: 10, productId: 1 };
    const result = checkOrderItemValid(
      null,
      orderItem,
      mockSoldByProductId,
      productsById
    );
    expect(result).toBe("Produkt nicht verfügbar");
  });

  it("should return error for non-existent product", () => {
    const orderItem: OrderItem = { value: 10, productId: 999 };
    const result = checkOrderItemValid(
      null,
      orderItem,
      mockSoldByProductId,
      mockProductsById
    );
    expect(result).toBe("Produkt nicht verfügbar");
  });

  it("should return error for negative value", () => {
    const orderItem: OrderItem = { value: -5, productId: 1 };
    const result = checkOrderItemValid(
      null,
      orderItem,
      mockSoldByProductId,
      mockProductsById
    );
    expect(result).toBe("Wert für Test Product darf nicht negativ sein");
  });

  it("should return error for value below minimum", () => {
    const orderItem: OrderItem = { value: 2, productId: 1 };
    const result = checkOrderItemValid(
      null,
      orderItem,
      mockSoldByProductId,
      mockProductsById
    );
    expect(result).toBe("Mindestmenge 5 g von Test Product nicht erreicht");
  });

  it("should return error for value above maximum available", () => {
    const orderItem: OrderItem = { value: 60, productId: 1 };
    const result = checkOrderItemValid(
      null,
      orderItem,
      mockSoldByProductId,
      mockProductsById
    );
    expect(result).toBe(
      "Maximal verfügbare Menge 20 g von Test Product überschritten"
    );
  });

  it("should return error for value not matching step size", () => {
    const productWithStep = { ...mockProduct, quantityStep: 2 };
    const productsById = { ...mockProductsById, 1: productWithStep };
    const orderItem: OrderItem = { value: 7, productId: 1 };
    const result = checkOrderItemValid(
      null,
      orderItem,
      mockSoldByProductId,
      productsById
    );
    expect(result).toBe(
      "Menge für Test Product muss ein Vielfaches von 2 g sein"
    );
  });

  it("should consider saved value when checking maximum", () => {
    const orderItem: OrderItem = { value: 20, productId: 1 };
    const result = checkOrderItemValid(
      20,
      orderItem,
      { ...mockSoldByProductId, 1: { ...mockSoldByProductId[1], sold: 100 } },
      mockProductsById
    );
    expect(result).toBeNull();
  });

  it("should handle different units in error messages", () => {
    const productWithUnit = { ...mockProduct, unit: Unit.PIECE };
    const productsById = { ...mockProductsById, 1: productWithUnit };
    const orderItem: OrderItem = { value: 2, productId: 1 };
    const result = checkOrderItemValid(
      null,
      orderItem,
      mockSoldByProductId,
      productsById
    );
    expect(result).toBe("Mindestmenge 5 Stk. von Test Product nicht erreicht");
  });
});
