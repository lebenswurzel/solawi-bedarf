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
import {
  checkOrderItemValid,
  getRemainingDepotCapacity,
  getMaxAvailable,
  getMinAvailable,
} from "./capacity";
import {
  OrderItem,
  ProductWithProductCategoryTyp,
  Depot,
  ExistingConfig,
} from "../types";
import { Unit, ProductCategoryType, UserRole } from "../enum";

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

describe("getRemainingDepotCapacity", () => {
  it("should return null when depot capacity is null", () => {
    const depot: Depot = {
      id: 1,
      name: "Test Depot",
      address: "Test Address",
      openingHours: "Test Hours",
      comment: null,
      capacity: null,
      active: true,
      rank: 1,
    };
    const result = getRemainingDepotCapacity(depot, 0, 1);
    expect(result).toBeNull();
  });

  it("should return remaining capacity when not saved depot", () => {
    const depot: Depot = {
      id: 1,
      name: "Test Depot",
      address: "Test Address",
      openingHours: "Test Hours",
      comment: null,
      capacity: 100,
      active: true,
      rank: 1,
    };
    const result = getRemainingDepotCapacity(depot, 50, 2);
    expect(result).toBe(50);
  });

  it("should add 1 to remaining capacity when saved depot", () => {
    const depot: Depot = {
      id: 1,
      name: "Test Depot",
      address: "Test Address",
      openingHours: "Test Hours",
      comment: null,
      capacity: 100,
      active: true,
      rank: 1,
    };
    const result = getRemainingDepotCapacity(depot, 50, 1);
    expect(result).toBe(51);
  });
});

describe("getMaxAvailable", () => {
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

  it("should return max available without saved value", () => {
    const result = getMaxAvailable(
      null,
      1,
      mockProductsById,
      mockSoldByProductId
    );
    expect(result).toBe(20); // (100 - 50) / 1
  });

  it("should return max available with saved value", () => {
    const result = getMaxAvailable(
      10,
      1,
      mockProductsById,
      mockSoldByProductId
    );
    expect(result).toBe(20); // (100 - 50 + 10) / 1
  });

  it("should respect product quantityMax", () => {
    const productWithLowerMax = { ...mockProduct, quantityMax: 30 };
    const productsById = { ...mockProductsById, 1: productWithLowerMax };
    const result = getMaxAvailable(null, 1, productsById, mockSoldByProductId);
    expect(result).toBe(30); // Limited by quantityMax
  });
});

describe("getMinAvailable", () => {
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

  const mockProductsById = {
    1: mockProduct,
  };

  const mockConfig: ExistingConfig = {
    id: 1,
    name: "Test Config",
    startOrder: new Date(),
    startBiddingRound: new Date(),
    endBiddingRound: new Date(),
    budget: 1000,
    validFrom: new Date(),
    validTo: new Date(),
    public: true,
  };

  it("should return quantityMin when not increase only", () => {
    const result = getMinAvailable(
      null,
      1,
      UserRole.USER,
      mockConfig,
      new Date(),
      mockProductsById
    );
    expect(result).toBe(5);
  });

  it("should return saved value when increase only and saved value is higher", () => {
    const result = getMinAvailable(
      10,
      1,
      UserRole.USER,
      mockConfig,
      new Date(),
      mockProductsById
    );
    expect(result).toBe(10);
  });

  it("should return quantityMin when increase only but saved value is lower", () => {
    const result = getMinAvailable(
      1,
      1,
      UserRole.USER,
      mockConfig,
      new Date(),
      mockProductsById
    );
    expect(result).toBe(5);
  });
});
