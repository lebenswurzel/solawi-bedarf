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
import { getUserFromContext } from "../getUserFromContext";
import {
  getConfigIdFromQuery,
  getNumericQueryParameter,
} from "../../util/requestUtil";
import { Order } from "../../database/Order";
import { AppDataSource } from "../../database/database";
import {
  Msrp,
  ProductId,
  ProductsById,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import {
  calculateMsrpWeights,
  getMsrp,
  getOrderItemAdjustedMonthlyMsrp,
} from "@lebenswurzel/solawi-bedarf-shared/src/msrp";
import { bi } from "./bi";
import { calculateOrderValidMonths } from "@lebenswurzel/solawi-bedarf-shared/src/msrp";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { http } from "../../consts/http";
import { config as configBackend } from "../../config";
import { Depot } from "../../database/Depot";
import { OrderItem } from "../../database/OrderItem";

interface OrderMsrpValues {
  order: Order;
  validFrom: Date | null;
  msrp: Msrp;
  productMsrpWeights: { [key: ProductId]: number };
  productsById: ProductsById; // TODO: remove this later, just for debugging
  productMsrps: {
    [key: string]: number;
  };
}

export const calcMsrp = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  await getUserFromContext(ctx);
  const configId = getConfigIdFromQuery(ctx);
  const userId = getNumericQueryParameter(ctx.request.query, "id", 0);

  const config = await AppDataSource.getRepository(RequisitionConfig).findOne({
    where: { id: configId },
  });

  if (!config) {
    ctx.throw(http.bad_request, `Config ${configId} not found`);
  }

  const depots = await AppDataSource.getRepository(Depot).find();

  const orders = await AppDataSource.getRepository(Order).find({
    where: {
      requisitionConfigId: configId,
      userId,
    },
    order: {
      validFrom: "ASC",
    },
    select: {
      validFrom: true,
      category: true,
      orderItems: true,
    },
    relations: {
      orderItems: true,
    },
  });

  type ProductKey = string;

  const productKey = (oi: OrderItem, productsById: ProductsById): ProductKey =>
    `${productsById[oi.productId].name}_${oi.productId}`;

  const orderMsrpValues: OrderMsrpValues[] = await Promise.all(
    orders.map(async (order) => {
      const { deliveredByProductIdDepotId, productsById } = await bi(
        configId,
        order.validFrom || undefined,
        true,
      );

      const validMonths = calculateOrderValidMonths(
        order.validFrom,
        config.validTo,
        configBackend.timezone,
      );

      const productMsrpWeights = calculateMsrpWeights(
        productsById,
        deliveredByProductIdDepotId,
        depots,
      );

      return {
        order,
        validFrom: order.validFrom,
        msrp: getMsrp(
          order.category,
          order.orderItems,
          productsById,
          validMonths,
          productMsrpWeights,
        ),
        productMsrpWeights,
        productMsrps: order.orderItems.reduce(
          (acc, oi) => {
            acc[productKey(oi, productsById)] = getOrderItemAdjustedMonthlyMsrp(
              order.category,
              oi,
              productsById,
              validMonths,
              productMsrpWeights,
            );
            return acc;
          },
          {} as { [key: string]: number },
        ),
        productsById,
      };
    }),
  );
  console.log(orderMsrpValues);

  const calculateEffectiveMsrp = (
    laterOrder: OrderMsrpValues,
    earlierOrder: OrderMsrpValues,
  ): { [key: ProductKey]: number } => {
    const result: { [key: ProductKey]: number } = {};
    for (const orderItem of laterOrder.order.orderItems) {
      const earlierOrderItem = earlierOrder.order.orderItems.find(
        (oi) => oi.productId === orderItem.productId,
      );
      const pk = productKey(orderItem, laterOrder.productsById);
      let offset = 0;
      if (earlierOrderItem) {
        // calculate over/under price paid
        offset =
          earlierOrder.productMsrps[pk] *
          (earlierOrder.msrp.months *
            laterOrder.productMsrpWeights[orderItem.productId] -
            laterOrder.msrp.months);
        console.log(
          pk,
          offset,
          earlierOrder.productMsrps[pk],
          earlierOrder.msrp.months,
          earlierOrder.productMsrpWeights[orderItem.productId],
          laterOrder.msrp.months,
          laterOrder.productMsrpWeights[orderItem.productId],
        );
      }
      result[pk] =
        laterOrder.productMsrps[pk] - offset / laterOrder.msrp.months;
    }
    return result;
  };

  const effectiveMsrp = calculateEffectiveMsrp(
    orderMsrpValues[1],
    orderMsrpValues[0],
  );
  const effectiveMsrpSum: number = Object.values(effectiveMsrp).reduce(
    (acc, value) => acc + value,
    0,
  );
  console.log(effectiveMsrpSum);

  ctx.body = {
    effectiveMsrp,
    effectiveMsrpSum,
  };
  ctx.status = http.ok;
};
