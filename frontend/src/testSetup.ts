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
import { beforeEach } from "vitest";
import { Unit } from "../../shared/src/enum";
import {
  Depot,
  NewDepot,
  NewProduct,
  Product,
  ProductCategoryWithProducts,
  Shipment,
  ShipmentItem,
} from "../../shared/src/types";

let NEXT_ID = 0;

beforeEach(() => {
  NEXT_ID = 0;
});

export function genId(): number {
  return NEXT_ID++;
}

export const TOMATO = {
  description: "",
  name: "Tomato",
  active: true,
  msrp: 1,
  frequency: 30,
  quantity: 200,
  quantityMin: 100,
  quantityMax: 300,
  quantityStep: 50,
  unit: Unit.WEIGHT,
};

export const CUCUMBER = {
  description: "",
  name: "Cucumber",
  active: true,
  msrp: 1,
  frequency: 20,
  quantity: 2,
  quantityMin: 1,
  quantityMax: 30,
  quantityStep: 1,
  unit: Unit.PIECE,
};

export const MILK = {
  description: "",
  name: "Milk",
  active: true,
  msrp: 1,
  frequency: 56,
  quantity: 200,
  quantityMin: 100,
  quantityMax: 300,
  quantityStep: 1,
  unit: Unit.VOLUME,
};

export const VEGETABLES = {
  name: "01 Vegetables",
  active: true,
};

export const MILK_PRODUCTS = {
  name: "02 Milk products",
  active: true,
};

export function genProductGroupWithProducts(
  overwrite: Partial<ProductCategoryWithProducts> = {},
): ProductCategoryWithProducts {
  let id = genId();
  const base: ProductCategoryWithProducts = {
    id: id,
    name: "Product Group " + id,
    active: true,
    products: [],
  };
  const result = { ...base, ...overwrite };
  result.products.forEach((product) => (product.productCategoryId = id));
  return result;
}

export function genProduct(overwrite: Partial<NewProduct> = {}): Product {
  let id = genId();
  const base: Product = {
    id: id,
    description: null,
    name: "Product " + id,
    active: true,
    msrp: 1,
    frequency: 30,
    quantity: 20,
    quantityMin: 10,
    quantityMax: 30,
    quantityStep: 5,
    unit: Unit.WEIGHT,
    productCategoryId: 0,
  };
  return { ...base, ...overwrite };
}

export function genDepot(overwrite: Partial<NewDepot> = {}): Depot {
  let id = genId();
  const base: Depot = {
    id: id,
    name: "Main depot",
    address: "Address",
    openingHours: "Opening Hours",
    comment: null,
    capacity: null,
    active: true,
  };
  return { ...base, ...overwrite };
}

export function genShipment(overwrite: Partial<Shipment> = {}): Shipment {
  const base: Shipment = {
    description: null,
    validFrom: new Date(),
    shipmentItems: [],
    additionalShipmentItems: [],
    active: true,
    updatedAt: new Date(),
  };
  return { ...base, ...overwrite };
}

export function genShipmentItem(
  product: Product,
  depot: Depot,
  overwrite: Partial<ShipmentItem> = {},
): ShipmentItem {
  const base: ShipmentItem = {
    productId: product.id,
    depotId: depot.id,
    totalShipedQuantity: 1,
    unit: product.unit,
    isBio: true,
    description: product.description,
    multiplicator: 100,
    conversionFrom: 1,
    conversionTo: 1,
  };
  return { ...base, ...overwrite };
}
