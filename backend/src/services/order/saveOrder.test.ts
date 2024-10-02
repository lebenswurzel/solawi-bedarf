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
import { ConfirmedOrder } from "../../../../shared/src/types";
import {
  TestUserData,
  createBasicTestCtx,
  testAsUser1,
} from "../../../testSetup";
import { Depot } from "../../database/Depot";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { AppDataSource } from "../../database/database";
import {
  dateDeltaDays,
  findOrdersByUser,
  getDepotByName,
  getProductByName,
  updateRequisition,
} from "../../../test/testHelpers";
import { bi } from "../bi/bi";
import { saveOrder } from "./saveOrder";

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => saveOrder(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent access for different user",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: userData.userId + 100,
    });
    await expect(() => saveOrder(ctx)).rejects.toThrowError("Error 403");
  },
);

testAsUser1("save empty order", async ({ userData }: TestUserData) => {
  const configId = await updateRequisition(true);
  const depot = await getDepotByName("d1");
  const request: ConfirmedOrder = {
    confirmGTC: true,
    category: UserCategory.CAT100,
    categoryReason: "nothing special",
    depotId: depot.id,
    orderItems: [],
    offer: 0,
    alternateDepotId: null,
    offerReason: null,
    validFrom: null,
  };

  // create order
  const ctx = createBasicTestCtx(request, userData.token, undefined, {
    id: userData.userId,
    configId,
  });

  expect((await findOrdersByUser(userData.userId)).length).toBe(0);

  await saveOrder(ctx);
  expect(ctx.status).toBe(204);
  const orders = await findOrdersByUser(userData.userId);
  expect(orders.length).toBe(1);
  expect(orders[0].categoryReason).toBe("nothing special");
  expect(orders[0].userId).toBe(userData.userId);

  // update order
  const ctx2 = createBasicTestCtx(
    { ...request, categoryReason: "updated" },
    userData.token,
    undefined,
    {
      id: userData.userId,
      configId,
    },
  );
  await saveOrder(ctx2);
  expect(ctx2.status).toBe(204);
  const orders2 = await findOrdersByUser(userData.userId);
  expect(orders2.length).toBe(1);
  expect(orders2[0].categoryReason).toBe("updated");
  expect(orders[0].userId).toBe(userData.userId);
});

testAsUser1("save order with products", async ({ userData }: TestUserData) => {
  const configId = await updateRequisition(true);
  const depot = await getDepotByName("d1");
  const baseRequest: ConfirmedOrder = {
    confirmGTC: true,
    category: UserCategory.CAT100,
    categoryReason: "nothing special",
    depotId: depot.id,
    orderItems: [],
    offer: 0,
    alternateDepotId: null,
    offerReason: null,
    validFrom: dateDeltaDays(-1),
  };

  const product1 = await getProductByName("p1");
  const product2 = await getProductByName("p2");

  const orderItem1 = {
    productId: product1.id,
    value: 3,
  };
  const orderItem2 = {
    productId: product2.id,
    value: 2,
  };
  const request = {
    ...baseRequest,
    offer: 100,
    orderItems: [orderItem1, orderItem2],
  };

  // create order
  const ctx = createBasicTestCtx(request, userData.token, undefined, {
    id: userData.userId,
    configId,
  });

  // run twice to ensure idempotency
  for (let i = 0; i < 2; i++) {
    await saveOrder(ctx);

    expect(ctx.status).toBe(204);
    const orders = await findOrdersByUser(userData.userId);
    expect(orders.length).toBe(1);
    expect(orders[0].categoryReason).toBe("nothing special");
    expect(orders[0].userId).toBe(userData.userId);
    expect(orders[0].orderItems).toMatchObject([orderItem1, orderItem2]);

    const { soldByProductId, capacityByDepotId, productsById } =
      await bi(configId);
    expect(soldByProductId[product1.id].sold).toBe(60);
    expect(soldByProductId[product2.id].sold).toBe(40);
    expect(capacityByDepotId[depot.id].reserved).toBe(1);
    expect(productsById[product1.id]).toMatchObject(product1);
    expect(productsById[product2.id]).toMatchObject(product2);
  }
  // expect(orders[0]).toMatchObject(baseRequest);
});

testAsUser1("bad requests", async ({ userData }: TestUserData) => {
  let configId = await updateRequisition(false);
  // requisition is not active
  let ctx = await _createCtx({}, { userData }, configId);
  await expect(() => saveOrder(ctx)).rejects.toThrowError(
    "Error 400: requisition not active",
  );

  // confirmGTC=false
  ctx = await _createCtx({ confirmGTC: false }, { userData }, configId);
  await expect(() => saveOrder(ctx)).rejects.toThrowError(
    "Error 400: commitment not confirmed",
  );
  configId = await updateRequisition(true);

  // no depot id
  ctx = await _createCtx({ depotId: undefined }, { userData }, configId);
  await expect(() => saveOrder(ctx)).rejects.toThrowError(
    "Error 400: no valid depot",
  );

  // invalid depot id
  ctx = await _createCtx({ depotId: -12 }, { userData }, configId);
  await expect(() => saveOrder(ctx)).rejects.toThrowError(
    "Error 400: no valid depot",
  );

  // no category reason
  ctx = await _createCtx(
    { category: UserCategory.CAT115, categoryReason: "" },
    { userData },
    configId,
  );
  await expect(() => saveOrder(ctx)).rejects.toThrowError(
    "Error 400: no category reason",
  );

  // invalid category
  // @ts-ignore just for testing
  ctx = await _createCtx({ category: "CAT1000" }, { userData }, configId);
  await expect(() => saveOrder(ctx)).rejects.toThrowError(
    "Error 400: no valid category",
  );

  // order item invalid
  ctx = await _createCtx({}, { userData }, configId, 100);
  await expect(() => saveOrder(ctx)).rejects.toThrowError(
    "Error 400: order item invalid",
  );

  // bid too low
  ctx = await _createCtx({ offer: 1 }, { userData }, configId);
  await expect(() => saveOrder(ctx)).rejects.toThrowError(
    "Error 400: bid too low",
  );

  // invalid offer reason
  ctx = await _createCtx({ offer: 18 }, { userData }, configId);
  await expect(() => saveOrder(ctx)).rejects.toThrowError(
    "Error 400: no offer reason",
  );

  // full depot
  ctx = await _createCtx({}, { userData }, configId, undefined, true);
  await expect(() => saveOrder(ctx)).rejects.toThrowError(
    "Error 400: no depot capacity left",
  );

  // increase only
  configId = await updateRequisition(true, true);
  ctx = await _createCtx({ offer: 25 }, { userData }, configId, 4); // increase -> ok
  await saveOrder(ctx);
  ctx = await _createCtx({}, { userData }, configId, 3); // try decrease -> error
  await expect(() => saveOrder(ctx)).rejects.toThrowError(
    "Error 400: not valid in bidding round",
  );

  // requisition not found
  ctx = await _createCtx({}, { userData }, configId + 1);
  await expect(() => saveOrder(ctx)).rejects.toThrowError(
    "Error 400: no valid config",
  );
});

/** Helper function to create specific saveOrder context */
const _createCtx = async (
  updatedFields: Partial<ConfirmedOrder>,
  { userData }: TestUserData,
  configId: number,
  orderItem1Value?: number,
  fullDepot?: boolean,
) => {
  const depot = await getDepotByName("d1");
  const baseRequest: ConfirmedOrder = {
    confirmGTC: true,
    category: UserCategory.CAT100,
    categoryReason: "nothing special",
    depotId: depot.id,
    orderItems: [],
    offer: 0,
    alternateDepotId: null,
    offerReason: null,
    validFrom: dateDeltaDays(-1),
  };

  const product1 = await getProductByName("p1");
  const product2 = await getProductByName("p2");
  const orderItem1 = {
    productId: product1.id,
    value: orderItem1Value || 3,
  };
  const orderItem2 = {
    productId: product2.id,
    value: 2,
  };
  const request = {
    ...baseRequest,
    offer: 21,
    orderItems: [orderItem1, orderItem2],
  };

  if (fullDepot) {
    depot.capacity = 0;
  } else {
    depot.capacity = 12;
  }
  await AppDataSource.getRepository(Depot).save(depot);

  return createBasicTestCtx(
    { ...request, ...updatedFields },
    userData.token,
    undefined,
    {
      id: userData.userId,
      configId,
    },
  );
};
