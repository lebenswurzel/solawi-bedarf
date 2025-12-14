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
import { getRequestUserId } from "../getUserFromContext";
import Koa from "koa";
import Router from "koa-router";
import { AppDataSource } from "../../database/database";
import { Order } from "../../database/Order";
import {
  BankDetails,
  SavedOrder,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import {
  getConfigIdFromQuery,
  getStringQueryParameter,
} from "../../util/requestUtil";
import { http } from "../../consts/http";

export const getOrder = async (
  ctx: Koa.ParameterizedContext<
    any,
    Router.IRouterParamContext<any, {}>,
    SavedOrder
  >,
) => {
  const requestUserId = await getRequestUserId(ctx);

  const configId = getConfigIdFromQuery(ctx);
  const option = getStringQueryParameter(ctx.request.query, "options", "");
  const orderId = getStringQueryParameter(ctx.request.query, "orderId", "");

  const relations = { orderItems: true, paymentInfo: true };
  if (option.includes("no-order-items")) {
    relations.orderItems = false;
  }

  // If a specific order ID is requested, return that order
  if (orderId) {
    const order = await AppDataSource.getRepository(Order).findOne({
      where: {
        id: parseInt(orderId),
        userId: requestUserId,
        requisitionConfigId: configId,
      },
      relations,
    });

    if (order) {
      ctx.body = unpackOrderPayment(order);
    } else {
      ctx.throw(http.not_found, `no order found with id ${orderId}`);
    }
    return;
  }

  // Get all orders for the user and config
  const allOrders: Order[] = await AppDataSource.getRepository(Order).find({
    where: { userId: requestUserId, requisitionConfigId: configId },
    relations,
    order: { validFrom: "DESC" }, // Most recent first
  });

  // If no specific order requested, return the currently valid one
  const now = new Date();
  const currentOrder = allOrders.find(
    (o) => o.validFrom <= now && o.validTo > now,
  );

  if (!currentOrder) {
    ctx.throw(http.not_found, "no current order found");
  }

  ctx.body = unpackOrderPayment(currentOrder);
};

/**
 * Converts the database representation of an order to the shared representation.
 * Especially unpacks the bank details from a JSON string to a BankDetails object.
 *
 * @param order The database representation of an order
 * @returns The shared representation of an order
 */
export const unpackOrderPayment = (order: Order): SavedOrder => {
  const paymentInfo = order.paymentInfo;
  if (!paymentInfo) {
    return {
      ...order,
      paymentInfo: null,
    };
  }
  return {
    ...order,
    paymentInfo: {
      paymentType: paymentInfo.paymentType,
      paymentRequired: paymentInfo.paymentRequired,
      paymentProcessed: paymentInfo.paymentProcessed,
      amount: paymentInfo.amount,
      bankDetails: JSON.parse(paymentInfo.bankDetails) as BankDetails,
    },
  };
};
