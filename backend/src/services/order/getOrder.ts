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
import { Order as OrderType } from "../../../../shared/src/types";
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

  const order: OrderType | null = await AppDataSource.getRepository(
    Order,
  ).findOne({
    select: columnsToSelect as (keyof Order)[],
    where: { userId: requestUserId, requisitionConfigId: configId },
    relations,
  });

  ctx.body = order || {};
};
