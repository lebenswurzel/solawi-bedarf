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
import Koa from "koa";
import Router from "koa-router";
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { Order } from "../../database/Order";
import { OrderItem } from "../../database/OrderItem";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { getRequestUserId, getUserFromContext } from "../getUserFromContext";
import { getConfigIdFromQuery } from "../../util/requestUtil";
import { calculateNewOrderValidFromDate } from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper";
import {
  isRequisitionActive,
  isIncreaseOnly,
} from "@lebenswurzel/solawi-bedarf-shared/src/validation/requisition";
import { config } from "../../config";

/**
 * Creates a new order modification during the bidding round.
 * The new order will start from the Friday before the first Thursday of the month
 * following the endBiddingRound, and the previous order's validTo will be set accordingly.
 */
export const modifyOrder = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const now = new Date();
  const { role, active } = await getUserFromContext(ctx);
  const requestUserId = await getRequestUserId(ctx);
  const configId = getConfigIdFromQuery(ctx);

  if (configId < 1) {
    ctx.throw(http.bad_request, `missing or bad config id (${configId})`);
  }

  const requisitionConfig = await AppDataSource.getRepository(
    RequisitionConfig,
  ).findOne({
    where: { id: configId },
  });

  if (!requisitionConfig) {
    ctx.throw(http.bad_request, `no valid config (id=${configId})`);
  }

  // Check if requisition is active and we're in the bidding round
  if (!isRequisitionActive(role, active, requisitionConfig, now)) {
    ctx.throw(http.bad_request, "requisition not active");
  }

  if (!isIncreaseOnly(role, requisitionConfig, now)) {
    ctx.throw(
      http.bad_request,
      "order modification only allowed during bidding round",
    );
  }

  try {
    const result = await createAdditionalOrder(
      requestUserId,
      requisitionConfig,
      now,
    );

    ctx.body = {
      message: "Order modification created successfully",
      ...result,
    };
    ctx.status = http.ok;
  } catch (error: any) {
    ctx.throw(http.bad_request, error.message);
  }
};

export const createAdditionalOrder = async (
  requestUserId: number,
  requisitionConfig: RequisitionConfig,
  now: Date,
) => {
  // Find the current valid order
  const allOrders = await AppDataSource.getRepository(Order).find({
    where: {
      userId: requestUserId,
      requisitionConfigId: requisitionConfig.id,
    },
    relations: { orderItems: true },
    order: { validFrom: "DESC" },
  });

  if (allOrders.length > 1) {
    throw new Error(
      "Currently only one additional order is allowed. This will be fixed in the future.",
    );
  }

  // Find the currently valid order (no validTo or validTo in the future)
  const currentOrder = allOrders.find(
    (o) =>
      (!o.validFrom || o.validFrom <= now) && (!o.validTo || o.validTo > now),
  );

  if (!currentOrder) {
    throw new Error("no current order found to modify");
  }

  // error if an order with a validFrom in the future exists
  const futureOrder = allOrders.find((o) => o.validFrom && o.validFrom > now);
  if (futureOrder) {
    throw new Error("an order with a validFrom in the future exists");
  }

  // Calculate dates for the new order
  const newOrderValidFrom = calculateNewOrderValidFromDate(
    requisitionConfig.endBiddingRound,
    config.timezone,
  );

  // Use a transaction to ensure all operations succeed or fail together
  const result = await AppDataSource.transaction(async (manager) => {
    // Update the current order's validTo
    await manager.update(
      Order,
      { id: currentOrder.id },
      {
        validTo: newOrderValidFrom,
        updatedAt: currentOrder.updatedAt, // prevent modification of updatedAt as we use it to indicate whether a user changed his order
      },
    );

    // Create the new order based on the current order
    const newOrder = new Order();
    newOrder.userId = requestUserId;
    newOrder.requisitionConfigId = requisitionConfig.id;
    newOrder.validFrom = newOrderValidFrom;
    newOrder.validTo = requisitionConfig.validTo;

    // Copy all properties from the current order
    newOrder.offer = currentOrder.offer;
    newOrder.depotId = currentOrder.depotId;
    newOrder.alternateDepotId = currentOrder.alternateDepotId;
    newOrder.productConfiguration = "";
    newOrder.offerReason = currentOrder.offerReason;
    newOrder.category = currentOrder.category;
    newOrder.categoryReason = currentOrder.categoryReason;
    newOrder.confirmGTC = false; // by default, order is not yet confirmed

    const savedNewOrder = await manager.save(Order, newOrder);

    // Copy all order items from the current order to the new order
    if (currentOrder.orderItems && currentOrder.orderItems.length > 0) {
      const newOrderItems = currentOrder.orderItems.map((item) => {
        const newItem = new OrderItem();
        newItem.orderId = savedNewOrder.id;
        newItem.productId = item.productId;
        newItem.value = item.value;
        return newItem;
      });

      await manager.save(OrderItem, newOrderItems);
    }

    return {
      newOrderId: savedNewOrder.id,
      validFrom: newOrderValidFrom,
      previousOrderValidTo: newOrderValidFrom,
    };
  });
  return result;
};
