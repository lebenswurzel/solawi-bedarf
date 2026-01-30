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
  getConfigIdFromQuery,
  getStringQueryParameter,
} from "../../util/requestUtil";
import { SavedOrder } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { unpackOrderPayment } from "./getOrder";

export const getAllOrders = async (
  ctx: Koa.ParameterizedContext<
    any,
    Router.IRouterParamContext<any, {}>,
    SavedOrder[]
  >,
) => {
  const requestUserId = await getRequestUserId(ctx);
  const configId = getConfigIdFromQuery(ctx);
  const option = getStringQueryParameter(ctx.request.query, "options", "");
  const noOrderItems = option.includes("no-order-items");
  const noPaymentInfo = option.includes("no-payment-info");

  const allOrders = await getUserOrders(
    requestUserId,
    configId,
    noOrderItems,
    noPaymentInfo,
  );
  ctx.body = allOrders.map(unpackOrderPayment);
};

export const getUserOrders = async (
  userId: number,
  configId: number,
  noOrderItems: boolean,
  noPaymentInfo: boolean,
) => {
  const relations = { orderItems: true, paymentInfo: true };
  if (noOrderItems) {
    relations.orderItems = false;
  }
  if (noPaymentInfo) {
    relations.paymentInfo = false;
  }
  const allOrders: Order[] = await AppDataSource.getRepository(Order).find({
    where: { userId: userId, requisitionConfigId: configId },
    order: { validFrom: "ASC" }, // Most recent last
    relations,
  });
  return allOrders;
};
