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
import { deleteProduct } from "./deleteProduct";
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
  await expect(() => deleteProduct(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent access for regular user",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: userData.userId,
    });
    await expect(() => deleteProduct(ctx)).rejects.toThrowError("Error 403");
  },
);

testAsAdmin("create and delete product", async ({ userData }: TestUserData) => {
  const productCategory = await createTestProductCategory("ProdCat");

  const product = genProduct() as NewProduct & OptionalId;
  delete product.id;
  product.productCategoryId = productCategory.id;

  // create new product
  let ctx = createBasicTestCtx(product, userData.token);
  await saveProduct(ctx);

  expect(ctx.status).toBe(http.created);

  let actualProducts = await getProducts(product.name || "");
  expect(actualProducts).toHaveLength(1);
  expect(actualProducts[0]).toMatchObject(product);

  // delete product
  ctx = createBasicTestCtx({ id: actualProducts[0].id }, userData.token);
  await deleteProduct(ctx);

  expect(ctx.status).toBe(http.no_content);

  actualProducts = await getProducts(product.name || "");
  expect(actualProducts).toEqual([]);
});

const getProducts = async (name: string) => {
  return await AppDataSource.getRepository(Product).find({ where: { name } });
};

testAsAdmin(
  "delete product that doesn't exist",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx({ id: 1 }, userData.token);
    await expect(() => deleteProduct(ctx)).rejects.toThrowError("Error 404");
  },
);
