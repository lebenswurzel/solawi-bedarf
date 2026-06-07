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
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { calculateNewOrderValidFromDate } from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper";
import {
  TestAdminAndUserData,
  TestUserData,
  createBasicTestCtx,
  setupDatabaseCleanup,
  testAsAdminAndUser,
  testAsUser1,
} from "../../../testSetup";
import {
  dateDeltaDays,
  findOrdersByUser,
  getDepotByName,
  getProductByName,
  updateRequisition,
} from "../../../test/testHelpers";
import { AppDataSource } from "../../database/database";
import { Order } from "../../database/Order";
import { OrderItem } from "../../database/OrderItem";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { config } from "../../config";
import {
  createAdditionalOrder,
  deleteUnconfirmedOrder,
  deleteUnconfirmedOrders,
  modifyOrder,
} from "./modifyOrder";

setupDatabaseCleanup();

const setupBiddingRoundConfig = async (): Promise<RequisitionConfig> => {
  const configId = await updateRequisition(true, true);
  return AppDataSource.getRepository(RequisitionConfig).findOneByOrFail({
    id: configId,
  });
};

const createCurrentOrder = async (
  userId: number,
  requisitionConfig: RequisitionConfig,
  options?: {
    validFrom?: Date;
    validTo?: Date;
    confirmGTC?: boolean;
    offer?: number;
    withOrderItem?: boolean;
  },
): Promise<Order> => {
  const depot = await getDepotByName("d1");
  const order = new Order();
  order.userId = userId;
  order.requisitionConfigId = requisitionConfig.id;
  order.validFrom = options?.validFrom ?? dateDeltaDays(-5);
  order.validTo = options?.validTo ?? requisitionConfig.validTo;
  order.confirmGTC = options?.confirmGTC ?? true;
  order.offer = options?.offer ?? 100;
  order.depotId = depot.id;
  order.category = UserCategory.CAT100;
  order.categoryReason = null;
  order.offerReason = null;
  order.alternateDepotId = null;
  const savedOrder = await AppDataSource.getRepository(Order).save(order);

  if (options?.withOrderItem) {
    const product = await getProductByName("p1");
    const orderItem = new OrderItem();
    orderItem.orderId = savedOrder.id;
    orderItem.productId = product.id;
    orderItem.value = 2;
    await AppDataSource.getRepository(OrderItem).save(orderItem);
  }

  return savedOrder;
};

const createModificationChain = async (
  userId: number,
  requisitionConfig: RequisitionConfig,
) => {
  const now = new Date();
  await createCurrentOrder(userId, requisitionConfig, { withOrderItem: true });
  return createAdditionalOrder(userId, requisitionConfig, now);
};

test("modifyOrder prevents unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => modifyOrder(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "modifyOrder prevents access outside bidding round",
  async ({ userData }: TestUserData) => {
    const configId = await updateRequisition(true, false);
    await createCurrentOrder(
      userData.userId,
      await AppDataSource.getRepository(RequisitionConfig).findOneByOrFail({
        id: configId,
      }),
    );

    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: userData.userId,
      configId,
    });

    await expect(() => modifyOrder(ctx)).rejects.toThrowError(
      "order modification only allowed during bidding round",
    );
  },
);

testAsUser1(
  "modifyOrder creates modification order during bidding round",
  async ({ userData }: TestUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();
    await createCurrentOrder(userData.userId, requisitionConfig);

    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: userData.userId,
      configId: requisitionConfig.id,
    });

    await modifyOrder(ctx);

    expect(ctx.status).toBe(200);
    expect(ctx.body.newOrderId).toBeDefined();

    const orders = await findOrdersByUser(userData.userId);
    expect(orders).toHaveLength(2);
    const modificationOrder = orders.find((o) => o.id === ctx.body.newOrderId);
    expect(modificationOrder?.confirmGTC).toBe(false);
  },
);

testAsUser1(
  "createAdditionalOrder creates modification and truncates current order",
  async ({ userData }: TestUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();
    const currentOrder = await createCurrentOrder(
      userData.userId,
      requisitionConfig,
      { offer: 120 },
    );
    const now = new Date();
    const expectedValidFrom = calculateNewOrderValidFromDate(
      requisitionConfig.endBiddingRound,
      config.timezone,
    );

    const result = await createAdditionalOrder(
      userData.userId,
      requisitionConfig,
      now,
    );

    expect(result.validFrom).toEqual(expectedValidFrom);
    expect(result.previousOrderValidTo).toEqual(expectedValidFrom);

    const orders = await findOrdersByUser(userData.userId);
    expect(orders).toHaveLength(2);

    const updatedCurrentOrder = orders.find((o) => o.id === currentOrder.id);
    const newOrder = orders.find((o) => o.id === result.newOrderId);

    expect(updatedCurrentOrder?.validTo).toEqual(expectedValidFrom);
    expect(updatedCurrentOrder?.updatedAt).toEqual(currentOrder.updatedAt);
    expect(newOrder?.validFrom).toEqual(expectedValidFrom);
    expect(newOrder?.validTo).toEqual(requisitionConfig.validTo);
    expect(newOrder?.confirmGTC).toBe(false);
    expect(newOrder?.offer).toBe(120);
  },
);

testAsUser1(
  "createAdditionalOrder copies order items to new order",
  async ({ userData }: TestUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();
    await createCurrentOrder(userData.userId, requisitionConfig, {
      withOrderItem: true,
    });

    const result = await createAdditionalOrder(
      userData.userId,
      requisitionConfig,
      new Date(),
    );

    const orders = await findOrdersByUser(userData.userId);
    const currentOrder = orders.find((o) => o.id !== result.newOrderId);
    const newOrder = orders.find((o) => o.id === result.newOrderId);

    expect(currentOrder?.orderItems).toHaveLength(1);
    expect(newOrder?.orderItems).toHaveLength(1);
    expect(newOrder?.orderItems[0].productId).toBe(
      currentOrder?.orderItems[0].productId,
    );
    expect(newOrder?.orderItems[0].value).toBe(
      currentOrder?.orderItems[0].value,
    );
  },
);

testAsUser1(
  "createAdditionalOrder throws when no current order exists",
  async ({ userData }: TestUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();

    await expect(() =>
      createAdditionalOrder(userData.userId, requisitionConfig, new Date()),
    ).rejects.toThrowError("no current order found to modify");
  },
);

testAsUser1(
  "createAdditionalOrder throws when future order already exists",
  async ({ userData }: TestUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();
    await createModificationChain(userData.userId, requisitionConfig);

    await expect(() =>
      createAdditionalOrder(userData.userId, requisitionConfig, new Date()),
    ).rejects.toThrowError("an order with a validFrom in the future exists");
  },
);

testAsUser1(
  "createAdditionalOrder throws when bidding round has ended",
  async ({ userData }: TestUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();
    requisitionConfig.endBiddingRound = dateDeltaDays(-1);
    await AppDataSource.getRepository(RequisitionConfig).save(
      requisitionConfig,
    );
    await createCurrentOrder(userData.userId, requisitionConfig);

    await expect(() =>
      createAdditionalOrder(userData.userId, requisitionConfig, new Date()),
    ).rejects.toThrowError(
      "Bieterrunde ist bereits beendet. Der Beginn der angepassten Bedarfsanmeldung kann daher nicht ermittelt werden.",
    );
  },
);

testAsUser1(
  "deleteUnconfirmedOrders restores predecessor validTo by default",
  async ({ userData }: TestUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();
    const { newOrderId } = await createModificationChain(
      userData.userId,
      requisitionConfig,
    );

    await deleteUnconfirmedOrders(userData.userId, requisitionConfig);

    const orders = await findOrdersByUser(userData.userId);
    expect(orders).toHaveLength(1);
    expect(orders[0].validTo).toEqual(requisitionConfig.validTo);
    expect(orders.find((o) => o.id === newOrderId)).toBeUndefined();
  },
);

testAsUser1(
  "deleteUnconfirmedOrders keeps predecessor validTo when restore is disabled",
  async ({ userData }: TestUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();
    const { newOrderId, validFrom } = await createModificationChain(
      userData.userId,
      requisitionConfig,
    );

    await deleteUnconfirmedOrders(userData.userId, requisitionConfig, {
      orderId: newOrderId,
      restorePredecessorValidTo: false,
    });

    const orders = await findOrdersByUser(userData.userId);
    expect(orders).toHaveLength(1);
    expect(orders[0].validTo).toEqual(validFrom);
    expect(orders.find((o) => o.id === newOrderId)).toBeUndefined();
  },
);

testAsUser1(
  "deleteUnconfirmedOrders throws when order is confirmed",
  async ({ userData }: TestUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();
    const order = await createCurrentOrder(userData.userId, requisitionConfig, {
      confirmGTC: true,
    });

    await expect(() =>
      deleteUnconfirmedOrders(userData.userId, requisitionConfig, {
        orderId: order.id,
      }),
    ).rejects.toThrowError("The order is already confirmed.");
  },
);

testAsUser1(
  "deleteUnconfirmedOrders throws when no predecessor exists",
  async ({ userData }: TestUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();
    const order = await createCurrentOrder(userData.userId, requisitionConfig, {
      confirmGTC: false,
    });

    await expect(() =>
      deleteUnconfirmedOrders(userData.userId, requisitionConfig, {
        orderId: order.id,
      }),
    ).rejects.toThrowError(
      "At least one predecessor order is required to delete unconfirmed orders.",
    );
  },
);

testAsUser1(
  "deleteUnconfirmedOrders throws when a following order exists",
  async ({ userData }: TestUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();
    const splitDate = calculateNewOrderValidFromDate(
      requisitionConfig.endBiddingRound,
      config.timezone,
    );
    const predecessor = await createCurrentOrder(
      userData.userId,
      requisitionConfig,
      { validTo: splitDate, confirmGTC: true },
    );
    const middleOrder = await createCurrentOrder(
      userData.userId,
      requisitionConfig,
      {
        validFrom: splitDate,
        validTo: requisitionConfig.validTo,
        confirmGTC: false,
      },
    );
    const followingOrder = await createCurrentOrder(
      userData.userId,
      requisitionConfig,
      {
        validFrom: requisitionConfig.validTo,
        validTo: dateDeltaDays(400),
        confirmGTC: false,
      },
    );
    middleOrder.validTo = followingOrder.validFrom;
    await AppDataSource.getRepository(Order).save(middleOrder);

    await expect(() =>
      deleteUnconfirmedOrders(userData.userId, requisitionConfig, {
        orderId: middleOrder.id,
      }),
    ).rejects.toThrowError(
      "Cannot delete an order that has a following order.",
    );

    expect(
      (await findOrdersByUser(userData.userId)).find(
        (o) => o.id === predecessor.id,
      ),
    ).toBeDefined();
  },
);

testAsUser1(
  "deleteUnconfirmedOrders throws when order is not found",
  async ({ userData }: TestUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();

    await expect(() =>
      deleteUnconfirmedOrders(userData.userId, requisitionConfig, {
        orderId: 999999,
      }),
    ).rejects.toThrowError("Order not found.");
  },
);

test("deleteUnconfirmedOrder prevents unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => deleteUnconfirmedOrder(ctx)).rejects.toThrowError(
    "Error 401",
  );
});

testAsUser1(
  "deleteUnconfirmedOrder prevents access for non-admin",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: userData.userId,
      configId: await updateRequisition(true, true),
      orderId: 1,
    });

    await expect(() => deleteUnconfirmedOrder(ctx)).rejects.toThrowError(
      "Error 403",
    );
  },
);

testAsAdminAndUser(
  "deleteUnconfirmedOrder rejects missing order id",
  async ({ userData }: TestAdminAndUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();
    const ctx = createBasicTestCtx(undefined, userData.adminToken, undefined, {
      id: userData.userId,
      configId: requisitionConfig.id,
    });

    await expect(() => deleteUnconfirmedOrder(ctx)).rejects.toThrowError(
      "missing or bad order id",
    );
  },
);

testAsAdminAndUser(
  "deleteUnconfirmedOrder deletes order without restoring predecessor validTo",
  async ({ userData }: TestAdminAndUserData) => {
    const requisitionConfig = await setupBiddingRoundConfig();
    const { newOrderId, validFrom } = await createModificationChain(
      userData.userId,
      requisitionConfig,
    );

    const ctx = createBasicTestCtx(undefined, userData.adminToken, undefined, {
      id: userData.userId,
      configId: requisitionConfig.id,
      orderId: newOrderId,
    });

    await deleteUnconfirmedOrder(ctx);

    expect(ctx.status).toBe(204);

    const orders = await findOrdersByUser(userData.userId);
    expect(orders).toHaveLength(1);
    expect(orders[0].validTo).toEqual(validFrom);
    expect(orders.find((o) => o.id === newOrderId)).toBeUndefined();
  },
);
