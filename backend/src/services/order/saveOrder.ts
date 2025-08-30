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
import { addMonths } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import Koa from "koa";
import Router from "koa-router";
import { LessThan } from "typeorm";
import { appConfig } from "@lebenswurzel/solawi-bedarf-shared/src/config";
import {
  calculateEffectiveMsrp,
  calculateMsrpWeights,
  calculateOrderValidMonths,
  getMsrp,
} from "@lebenswurzel/solawi-bedarf-shared/src/msrp";
import {
  ConfirmedOrder,
  DeliveredByProductIdDepotId,
  Msrp,
  ProductId,
  ProductsById,
  OrderItem as SharedOrderItem,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import {
  getRemainingDepotCapacity,
  checkOrderItemValid,
} from "@lebenswurzel/solawi-bedarf-shared/src/validation/capacity";
import {
  isCategoryReasonValid,
  isOfferReasonValid,
  isOfferValid,
} from "@lebenswurzel/solawi-bedarf-shared/src/validation/reason";
import {
  determineCurrentOrderId,
  determineModificationOrderId,
  isRequisitionActive,
  isValidBiddingOrder,
} from "@lebenswurzel/solawi-bedarf-shared/src/validation/requisition";
import { config } from "../../config";
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { Depot } from "../../database/Depot";
import { Order } from "../../database/Order";
import { OrderItem } from "../../database/OrderItem";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { bi } from "../bi/bi";
import { getRequestUserId, getUserFromContext } from "../getUserFromContext";
import { getSameOrNextThursday } from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper";
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { sendOrderConfirmationMail } from "../email/orderConfirmationMail";

export const saveOrder = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const currentTime = new Date();
  const { role, active, id } = await getUserFromContext(ctx);
  const requestUserId = await getRequestUserId(ctx);
  const body = ctx.request.body as ConfirmedOrder;
  const sendConfirmationEmail = body.sendConfirmationEmail || false;

  const isEditedByOtherUser = requestUserId !== id;

  const configId = body.requisitionConfigId;
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
  if (!body.confirmGTC && !isEditedByOtherUser) {
    ctx.throw(http.bad_request, "commitment not confirmed");
  }
  if (!appConfig.availableCategories.includes(body.category)) {
    ctx.throw(http.bad_request, "no valid category");
  }

  if (!isRequisitionActive(role, active, requisitionConfig, currentTime)) {
    ctx.throw(http.bad_request, "requisition not active");
  }
  if (!isCategoryReasonValid(body.category, body.categoryReason)) {
    ctx.throw(http.bad_request, "no category reason");
  }
  const depots = await AppDataSource.getRepository(Depot).find();
  const depot = depots.find((d) => d.id === body.depotId);
  if (!depot || !depot.active) {
    ctx.throw(http.bad_request, "no valid depot");
  }
  // Find all orders for the user and config to determine the current valid one
  const allOrders = await AppDataSource.getRepository(Order).find({
    where: { userId: requestUserId, requisitionConfigId: configId },
    relations: { orderItems: true },
    order: { validFrom: "DESC" },
  });

  // Find the currently valid order
  const orderId = determineModificationOrderId(
    allOrders,
    currentTime,
    config.timezone,
  );
  const order = allOrders.find((o) => o.id === orderId);

  if (!order) {
    ctx.throw(http.bad_request, "no order to modify");
  }

  if (!isValidBiddingOrder(role, requisitionConfig, currentTime, null, body)) {
    ctx.throw(http.bad_request, "not valid in bidding round");
  }
  const dateOfInterest = getSameOrNextThursday(order.validFrom || currentTime);
  const {
    soldByProductId,
    capacityByDepotId,
    productsById,
    deliveredByProductIdDepotId,
  } = await bi(
    requisitionConfig.id,
    order.validFrom || undefined,
    true,
    new Date(), // TODO: use dateOfInterest?
  );
  const remainingDepotCapacity = getRemainingDepotCapacity(
    depot,
    capacityByDepotId[body.depotId].reserved,
    order?.depotId || 0,
  );
  if (remainingDepotCapacity != null && remainingDepotCapacity == 0) {
    ctx.throw(http.bad_request, "no depot capacity left");
  }
  const orderItemErrors = body.orderItems
    .map((actualOrderItem) =>
      checkOrderItemValid(
        order?.orderItems.find(
          (item) => item.productId === actualOrderItem.productId,
        )?.value || null,
        actualOrderItem,
        soldByProductId,
        productsById,
        1, // TODO: use actual productMsrpWeight to detect if the product is already sold out
      ),
    )
    .filter((error): error is string => error !== null);

  if (orderItemErrors.length > 0) {
    ctx.throw(http.bad_request, `${orderItemErrors.join("\n")}`);
  }

  const previousOrderId = determineCurrentOrderId(
    allOrders,
    currentTime,
    config.timezone,
  );

  if (previousOrderId == orderId) {
    ctx.throw(
      http.internal_server_error,
      "internal error: previous order id is the same as the current order id",
    );
  }

  const previousOrder = allOrders.find((o) => o.id === previousOrderId);

  if (previousOrder) {
    if (previousOrder.offer > body.offer) {
      ctx.throw(
        http.bad_request,
        "new bid must not be lower than previous bid",
      );
    }
  }

  const { modificationMsrp } = await determineEffectiveMsrp(
    body.category,
    body.orderItems,
    productsById,
    deliveredByProductIdDepotId,
    depots,
    requisitionConfig,
    order,
    previousOrder,
  );
  if (!isOfferValid(body.offer, modificationMsrp.monthly.total)) {
    ctx.throw(http.bad_request, "bid too low");
  }
  if (
    !isOfferReasonValid(
      body.offer,
      modificationMsrp.monthly.total,
      body.offerReason,
    )
  ) {
    ctx.throw(http.bad_request, "no offer reason");
  }

  order.offer = body.offer;
  order.depotId = body.depotId;
  order.alternateDepotId = body.alternateDepotId;
  order.productConfiguration = ""; // storing this produces a lot of data in the database, so we don't do it anymore; JSON.stringify(productCategories);
  order.offerReason = body.offerReason || "";
  order.category = body.category;
  order.categoryReason = body.categoryReason || "";
  if (!isEditedByOtherUser) {
    // only the user who has created the order can confirm it
    order.confirmGTC = body.confirmGTC || false;
  }
  if (body.validFrom) {
    order.validFrom = body.validFrom;
  }
  if (body.validTo) {
    order.validTo = body.validTo;
  }

  await AppDataSource.transaction(async (entityManager) => {
    // save order
    await entityManager.save(order);
    for (const requestOrderItem of body.orderItems) {
      let item =
        order.orderItems &&
        order.orderItems.find(
          (orderItem) => orderItem.productId == requestOrderItem.productId,
        );
      if (item) {
        item.value = requestOrderItem.value;
        await entityManager.save(item);
      } else {
        item = new OrderItem();
        item.productId = requestOrderItem.productId;
        item.orderId = order.id;
        item.value = requestOrderItem.value;
        await entityManager.save(item);
      }
    }
    await entityManager.delete(OrderItem, { value: LessThan(1) });
  });

  // Send confirmation email to user (if option is set) and always to the EMAIL_ORDER_UPDATED_BCC (if set)
  await sendOrderConfirmationMail({
    orderId: order.id,
    requestUserId,
    changingUserId: id,
    requisitionConfig,
    sendConfirmationEmail,
  });

  ctx.status = http.no_content;
};

const determineEffectiveMsrp = async (
  category: UserCategory,
  orderItems: SharedOrderItem[],
  productsById: ProductsById,
  deliveredByProductIdDepotId: DeliveredByProductIdDepotId,
  depots: Depot[],
  requisitionConfig: RequisitionConfig,
  modificationOrder: Order,
  currentOrder?: Order,
): Promise<{
  modificationMsrp: Msrp;
  previousMsrp: Msrp | null;
}> => {
  const productMsrpWeights = calculateMsrpWeights(
    productsById,
    deliveredByProductIdDepotId,
    depots,
  );
  const msrp = getMsrp(
    category,
    orderItems,
    productsById,
    calculateOrderValidMonths(
      modificationOrder.validFrom,
      requisitionConfig.validTo,
      config.timezone,
    ),
    productMsrpWeights,
  );
  if (!currentOrder) {
    return {
      modificationMsrp: msrp,
      previousMsrp: null,
    };
  }

  const {
    deliveredByProductIdDepotId: currentOrderDeliveredByProductIdDepotId,
  } = await bi(requisitionConfig.id, currentOrder.validFrom || undefined);

  const currentProductMsrpWeights = calculateMsrpWeights(
    productsById,
    currentOrderDeliveredByProductIdDepotId,
    depots,
  );

  const previousMsrp = getMsrp(
    currentOrder.category,
    currentOrder.orderItems,
    productsById,
    calculateOrderValidMonths(
      currentOrder.validFrom,
      requisitionConfig.validTo,
      config.timezone,
    ),
    currentProductMsrpWeights,
  );

  const effectiveMsrp = calculateEffectiveMsrp(
    {
      earlierOrder: currentOrder,
      laterOrder: modificationOrder,
    },
    { [modificationOrder.id]: msrp, [currentOrder.id]: previousMsrp },
    {
      [modificationOrder.id]: productMsrpWeights,
      [currentOrder.id]: currentProductMsrpWeights,
    },
    productsById,
  );
  return {
    modificationMsrp: effectiveMsrp,
    previousMsrp,
  };
};
