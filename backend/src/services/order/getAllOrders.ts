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
import { getConfigIdFromQuery } from "../../util/requestUtil";

export const getAllOrders = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const requestUserId = await getRequestUserId(ctx);
  const configId = getConfigIdFromQuery(ctx);

  // Get all orders for the user and config
  const allOrders: OrderType[] = await AppDataSource.getRepository(Order).find({
    where: { userId: requestUserId, requisitionConfigId: configId },
    order: { validFrom: "DESC" }, // Most recent first
  });

  ctx.body = allOrders || [];
};
