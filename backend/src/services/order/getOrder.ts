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
import { Order as OrderType } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import {
  getConfigIdFromQuery,
  getStringQueryParameter,
} from "../../util/requestUtil";

export const getOrder = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const requestUserId = await getRequestUserId(ctx);

  const configId = getConfigIdFromQuery(ctx);
  const option = getStringQueryParameter(ctx.request.query, "options", "");
  const orderId = getStringQueryParameter(ctx.request.query, "orderId", "");

  let relations = { orderItems: true };
  if (option.includes("no-order-items")) {
    relations = { orderItems: false };
  }

  const allColumns: string[] = AppDataSource.getRepository(
    Order,
  ).metadata.columns.map((col) => col.propertyName);

  let columnsToSelect = undefined;
  if (option.includes("no-product-configuration")) {
    columnsToSelect = allColumns.filter(
      (col) => col !== "productConfiguration",
    );
  }

  // If a specific order ID is requested, return that order
  if (orderId) {
    const order = await AppDataSource.getRepository(Order).findOne({
      select: columnsToSelect as (keyof Order)[],
      where: {
        id: parseInt(orderId),
        userId: requestUserId,
        requisitionConfigId: configId,
      },
      relations,
    });

    if (order) {
      ctx.body = order;
    } else {
      ctx.body = {};
    }
    return;
  }

  // Get all orders for the user and config
  const allOrders: OrderType[] = await AppDataSource.getRepository(Order).find({
    select: columnsToSelect as (keyof Order)[],
    where: { userId: requestUserId, requisitionConfigId: configId },
    relations,
    order: { validFrom: "DESC" }, // Most recent first
  });

  // If no specific order requested, return the currently valid one
  const now = new Date();
  const currentOrder =
    allOrders.find(
      (o) =>
        (!o.validFrom || o.validFrom <= now) && (!o.validTo || o.validTo > now),
    ) || null;

  ctx.body = currentOrder || {};
};
