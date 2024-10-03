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
import { getNumericQueryParameter } from "../../util/requestUtil";
import { http } from "../../consts/http";

export const getOrder = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const requestUserId = await getRequestUserId(ctx);

  const configId = getNumericQueryParameter(ctx.request.query, "configId");
  if (configId < 1) {
    ctx.throw(http.bad_request, `missing or bad config id (${configId})`);
  }

  const order: OrderType | null = await AppDataSource.getRepository(
    Order,
  ).findOne({
    where: { userId: requestUserId, requisitionConfigId: configId },
    relations: { orderItems: true },
  });

  ctx.body = order || {};
};
