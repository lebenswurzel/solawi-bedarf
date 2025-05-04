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
import { expect, test } from "vitest";
import {
  NewProduct,
  OptionalId,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { genProduct } from "@lebenswurzel/solawi-bedarf-shared/testSetup";
import { createTestProductCategory } from "../../../test/testHelpers";
import {
  createBasicTestCtx,
  testAsAdmin,
  testAsUser1,
  TestUserData,
} from "../../../testSetup";
import { http } from "../../consts/http";
import { Product } from "../../database/Product";
import { AppDataSource } from "../../database/database";
import { saveProduct } from "./saveProduct";

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => saveProduct(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent access for regular user",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: userData.userId,
    });
    await expect(() => saveProduct(ctx)).rejects.toThrowError("Error 403");
  },
);

testAsAdmin("create new product", async ({ userData }: TestUserData) => {
  const productCategory = await createTestProductCategory("ProdCat");

  const product = genProduct() as NewProduct & OptionalId;
  delete product.id;
  product.productCategoryId = productCategory.id;

  // create new product
  const ctx = createBasicTestCtx(product, userData.token);
  await saveProduct(ctx);

  expect(ctx.status).toBe(http.created);

  let actualProducts = await getProducts(product.name || "");
  expect(actualProducts).toHaveLength(1);
  expect(actualProducts[0]).toMatchObject(product);

  // create new product -> wrong product category
  const badProduct = { ...product, productCategoryId: productCategory.id + 1 };
  const ctx2 = createBasicTestCtx(badProduct, userData.token);
  await expect(() => saveProduct(ctx2)).rejects.toThrowError(
    "violates foreign key constraint",
  );

  // create new product -> same name is forbidden
  const sameProduct = { ...product };
  delete sameProduct.id;
  const ctx3 = createBasicTestCtx(sameProduct, userData.token);
  await expect(() => saveProduct(ctx3)).rejects.toThrowError(
    "same name exists",
  );

  actualProducts = await getProducts(product.name || "");
  expect(actualProducts).toHaveLength(1);
  expect(actualProducts[0]).toMatchObject(product);
});

const getProducts = async (name: string) => {
  return await AppDataSource.getRepository(Product).find({ where: { name } });
};

testAsAdmin(
  "prevent saving product with missing fields",
  async ({ userData }: TestUserData) => {
    const invalidProduct = genProduct() as NewProduct & OptionalId;
    delete invalidProduct.id;
    delete invalidProduct.name; // Missing required 'name' field

    const ctx = createBasicTestCtx(invalidProduct, userData.token);
    await expect(() => saveProduct(ctx)).rejects.toThrowError(
      "violates not-null",
    );

    const actualProducts = await getProducts(invalidProduct.name || "");
    expect(actualProducts.length).toBe(0); // No product should be created
  },
);

testAsAdmin(
  "prevent saving product with invalid ID",
  async ({ userData }: TestUserData) => {
    const product = genProduct() as NewProduct & OptionalId;
    product.productCategoryId = -9999; // Invalid category ID

    const ctx = createBasicTestCtx(product, userData.token);

    await expect(() => saveProduct(ctx)).rejects.toThrowError(
      "Error 404: Product",
    );
  },
);

testAsAdmin("update existing product", async ({ userData }: TestUserData) => {
  const productCategory = await createTestProductCategory("ProdCat");
  const product = genProduct() as NewProduct & OptionalId;
  delete product.id;
  product.productCategoryId = productCategory.id;

  // Create new product
  let ctx = createBasicTestCtx(product, userData.token);
  await saveProduct(ctx);

  let actualProducts = await getProducts(product.name || "");
  expect(actualProducts.map((v) => v.name)).toEqual([product.name]);

  // Update product name
  const updatedProduct = { ...actualProducts[0], name: "Updated Product Name" };
  ctx = createBasicTestCtx(updatedProduct, userData.token);
  await saveProduct(ctx);

  actualProducts = await getProducts("Updated Product Name");
  expect(actualProducts.map((v) => v.name)).toEqual(["Updated Product Name"]);

  // Save product again as it is
  const sameProduct = { ...actualProducts[0] };
  ctx = createBasicTestCtx(sameProduct, userData.token);
  await saveProduct(ctx);

  actualProducts = await getProducts("Updated Product Name");
  expect(actualProducts).toEqual(actualProducts);
});
