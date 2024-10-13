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
import { http } from "..//consts/http";
import Koa from "koa";
import Router from "koa-router";
import { Order } from "../database/Order";
import { getUserFromContext } from "./getUserFromContext";
import { AppDataSource } from "../database/database";
import { MoreThan } from "typeorm";
import { UserRole } from "../../../shared/src/enum";
import { getMsrp } from "../../../shared/src/msrp";
import { bi } from "./bi/bi";
import {
  getConfigIdFromQuery,
  getNumericQueryParameter,
} from "../util/requestUtil";

export const getOverview = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const configId = getConfigIdFromQuery(ctx);

  const { productsById } = await bi(configId);
  const orders = await AppDataSource.getRepository(Order).find({
    relations: {
      orderItems: {
        product: true,
      },
      user: true,
      depot: true,
      alternateDepot: true,
    },
    where: {
      offer: MoreThan(0),
      requisitionConfigId: configId,
    },
    select: {
      offer: true,
      offerReason: true,
      category: true,
      categoryReason: true,
      depot: {
        name: true,
      },
      alternateDepot: {
        name: true,
      },
      user: {
        name: true,
      },
      orderItems: {
        productId: true,
        value: true,
      },
    },
  });

  const overview = orders.map((order) => {
    const msrp = getMsrp(order.category, order.orderItems, productsById);

    return {
      name: order.user.name,
      depot: order.depot.name,
      alternateDepot: order.alternateDepot?.name,
      msrp: msrp,
      offer: order.offer,
      offerReason: order.offerReason,
      category: order.category,
      categoryReason: order.categoryReason,
      items: order.orderItems.map((orderItem) => ({
        name: orderItem.product.name,
        value: orderItem.value,
        unit: orderItem.product.unit,
        category: orderItem.product.productCategoryId,
      })),
    };
  });

  ctx.body = { overview };
};
