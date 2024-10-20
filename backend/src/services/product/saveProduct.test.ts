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
import { UserCategory } from "../../../../shared/src/enum";
import {
  ConfirmedOrder,
  NewProduct,
  OptionalId,
} from "../../../../shared/src/types";
import {
  TestUserData,
  createBasicTestCtx,
  testAsAdmin,
  testAsUser1,
} from "../../../testSetup";
import { Depot } from "../../database/Depot";
import { AppDataSource } from "../../database/database";
import {
  dateDeltaDays,
  findOrdersByUser,
  getDepotByName,
  getProductByName,
  updateRequisition,
  createTestProductCategory,
} from "../../../test/testHelpers";
import { bi } from "../bi/bi";
import { saveProduct } from "./saveProduct";
import { Product } from "../../database/Product";
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
} from "../../../../shared/testSetup";
import { http } from "../../consts/http";

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => saveProduct(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent access for different user",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: userData.userId + 100,
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
  expect(actualProducts.map((v) => v.name)).toEqual([product.name]);

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
  expect(actualProducts.map((v) => v.name)).toEqual([product.name]);
});

const getProducts = async (name: string) => {
  return await AppDataSource.getRepository(Product).find({ where: { name } });
};
