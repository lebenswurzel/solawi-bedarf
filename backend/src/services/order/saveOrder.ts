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
import { getRequestUserId, getUserFromContext } from "../getUserFromContext";
import Koa from "koa";
import Router from "koa-router";
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { Order } from "../../database/Order";
import { OrderItem } from "../../database/OrderItem";
import { ProductCategory } from "../../database/ProductCategory";
import { Depot } from "../../database/Depot";
import {
  RequisitionConfig,
  RequisitionConfigName,
} from "../../database/RequisitionConfig";
import { Order as OrderType } from "../../../../shared/src/types";
import { appConfig } from "../../../../shared/src/config";
import { getMsrp } from "../../../../shared/src/msrp";
import {
  isRequisitionActive,
  isValidBiddingOrder,
} from "../../../../shared/src/validation/requisition";
import {
  isOfferValid,
  isCategoryReasonValid,
  isOfferReasonValid,
} from "../../../../shared/src/validation/reason";
import { bi } from "../bi/bi";
import {
  getRemainingDepotCapacity,
  isOrderItemValid,
} from "../../../../shared/src/validation/capacity";
import { LessThan } from "typeorm";

export const saveOrder = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const now = new Date();
  const { role, active, id } = await getUserFromContext(ctx);
  const requestUserId = await getRequestUserId(ctx);
  const body = ctx.request.body as OrderType & { confirmGTC: boolean };
  const requisitionConfig = await AppDataSource.getRepository(
    RequisitionConfig,
  ).findOne({
    where: { name: RequisitionConfigName },
  });
  if (!requisitionConfig) {
    ctx.throw(http.bad_request, "no valid config");
  }
  if (!body.confirmGTC) {
    ctx.throw(http.bad_request, "commitment not confirmed");
  }
  if (!appConfig.availableCategories.includes(body.category)) {
    ctx.throw(http.bad_request, "no valid category");
  }

  if (!isRequisitionActive(role, active, requisitionConfig, now)) {
    ctx.throw(http.bad_request, "requisition not active");
  }
  if (!isCategoryReasonValid(body.category, body.categoryReason)) {
    ctx.throw(http.bad_request, "no category reason");
  }
  const depot = await AppDataSource.getRepository(Depot).findOne({
    where: { id: body.depotId },
  });
  if (!depot || !depot.active) {
    ctx.throw(http.bad_request, "no valid depot");
  }
  let order = await AppDataSource.getRepository(Order).findOne({
    where: { userId: requestUserId },
    relations: { orderItems: true },
  });
  if (
    order &&
    !isValidBiddingOrder(role, requisitionConfig, now, order, body)
  ) {
    ctx.throw(http.bad_request, "not valid in bidding round");
  }
  const { soldByProductId, capacityByDepotId, productsById } = await bi();
  const remainingDepotCapacity = getRemainingDepotCapacity(
    depot,
    capacityByDepotId[body.depotId].reserved,
    order?.depotId || 0,
  );
  if (remainingDepotCapacity != null && remainingDepotCapacity == 0) {
    ctx.throw(http.bad_request, "no depot capacity left");
  }
  if (
    body.orderItems.some(
      (actualOrderItem) =>
        !isOrderItemValid(
          order,
          actualOrderItem,
          soldByProductId,
          productsById,
        ),
    )
  ) {
    ctx.throw(http.bad_request, "order item invalid");
  }
  const msrp = getMsrp(body.category, body.orderItems, productsById);
  if (!isOfferValid(body.offer, msrp)) {
    ctx.throw(http.bad_request, "bid too low");
  }
  if (!isOfferReasonValid(body.offer, msrp, body.offerReason)) {
    ctx.throw(http.bad_request, "no offer reason");
  }
  const productCategories = await AppDataSource.getRepository(
    ProductCategory,
  ).find({ relations: { products: true } });
  if (order) {
    order.offer = body.offer;
    order.depotId = body.depotId;
    order.alternateDepotId = body.alternateDepotId;
    order.productConfiguration = JSON.stringify(productCategories);
    order.offerReason = body.offerReason || "";
    order.category = body.category;
    order.categoryReason = body.categoryReason || "";
    await AppDataSource.getRepository(Order).save(order);
  } else {
    order = new Order();
    order.userId = requestUserId;
    order.offer = body.offer;
    order.offerReason = body.offerReason || "";
    order.categoryReason = body.categoryReason || "";
    order.alternateDepotId = body.alternateDepotId;
    order.depotId = body.depotId;
    order.category = body.category;
    order.productConfiguration = JSON.stringify(productCategories);
    await AppDataSource.getRepository(Order).save(order);
  }
  for (const requestOrderItem of body.orderItems) {
    let item =
      order.orderItems &&
      order.orderItems.find(
        (orderItem) => orderItem.productId == requestOrderItem.productId,
      );
    if (item) {
      item.value = requestOrderItem.value;
      await AppDataSource.getRepository(OrderItem).save(item);
    } else {
      item = new OrderItem();
      item.productId = requestOrderItem.productId;
      item.orderId = order.id;
      item.value = requestOrderItem.value;
      await AppDataSource.getRepository(OrderItem).save(item);
    }
  }
  // cleanup of useless items
  await AppDataSource.getRepository(OrderItem).delete({ value: LessThan(1) });

  ctx.status = http.no_content;
};
