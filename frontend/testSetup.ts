import { beforeEach } from "vitest";
import { Unit } from "../shared/src/enum";
import { Product, ProductCategoryWithProducts } from "../shared/src/types";

let NEXT_ID = 0;

beforeEach(() => {
  NEXT_ID = 0;
});

export function genId(): number {
  return NEXT_ID++;
}

export const TOMATO = {
  description: "a tasty tomato",
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
  description: "a tasty cucumber",
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
  description: "Milk",
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

export function genProduct(overwrite: Partial<Product> = {}): Product {
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
