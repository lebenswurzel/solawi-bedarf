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
import { LessThan } from "typeorm";
import { appConfig } from "@lebenswurzel/solawi-bedarf-shared/src/config";
import {
  calculateEffectiveMsrpChain,
  calculateOrderValidMonths,
  getMsrp,
} from "@lebenswurzel/solawi-bedarf-shared/src/msrp";
import {
  ConfirmedOrder,
  Msrp,
  OrderId,
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
  canEditOrder,
  determineModificationOrderId,
  determinePredecessorOrder,
  isOfferChangeValid,
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
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang";
import { availabilityWeights } from "../bi/availabilityWeights";

export const saveOrder = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const currentTime = new Date();
  const { role, active, id } = await getUserFromContext(ctx);
  const requestUserId = await getRequestUserId(ctx);
  const body = ctx.request.body as ConfirmedOrder;
  const sendConfirmationEmailToUser = body.sendConfirmationEmail || false;

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
    order: { validFrom: "ASC" },
  });

  // Find the currently valid order
  const modificationOrderId = determineModificationOrderId(
    allOrders,
    currentTime,
    config.timezone,
  );

  if (body.id) {
    if (!canEditOrder(role, modificationOrderId, body.id)) {
      ctx.throw(http.bad_request, `not allowed to edit order (${body.id})`);
    }
  }

  const selectedOrderId = body.id || modificationOrderId;
  const selectedOrder = allOrders.find((o) => o.id === selectedOrderId);
  if (!selectedOrder || !selectedOrderId) {
    ctx.throw(http.bad_request, `no order selected (${selectedOrderId})`);
  }

  // the relevant orders only include orders up until the selected order
  const relevantOrders = allOrders.filter(
    (o) => o.validFrom <= selectedOrder.validFrom,
  );

  if (!isValidBiddingOrder(role, requisitionConfig, currentTime, null, body)) {
    ctx.throw(http.bad_request, "not valid in bidding round");
  }
  let dateOfInterest = getSameOrNextThursday(selectedOrder.validFrom);
  if (dateOfInterest.getTime() < requisitionConfig.validFrom.getTime()) {
    // make sure the date of interest is at least the season start
    dateOfInterest = getSameOrNextThursday(requisitionConfig.validFrom);
  }
  const { soldByProductId, capacityByDepotId, productsById } = await bi(
    requisitionConfig.id,
    selectedOrder.validFrom,
    true,
    dateOfInterest,
  );
  const remainingDepotCapacity = getRemainingDepotCapacity(
    depot,
    capacityByDepotId[body.depotId].reserved,
    selectedOrder?.depotId || 0,
  );
  if (remainingDepotCapacity != null && remainingDepotCapacity == 0) {
    ctx.throw(http.bad_request, "no depot capacity left");
  }
  const orderItemErrors = body.orderItems
    .map((actualOrderItem) =>
      checkOrderItemValid(
        selectedOrder?.orderItems.find(
          (item) => item.productId === actualOrderItem.productId,
        )?.value || null,
        actualOrderItem,
        soldByProductId,
        productsById,
        1, // Use actual productMsrpWeight instead to detect if the product is already sold out?
        // Currently it's already checked in the frontend by the ShopItem component
      ),
    )
    .filter((error): error is string => error !== null);

  if (orderItemErrors.length > 0) {
    ctx.throw(http.bad_request, `${orderItemErrors.join("\n")}`);
  }

  const predecessorOrder = determinePredecessorOrder(
    relevantOrders,
    selectedOrderId,
  );

  if (predecessorOrder) {
    if (!isOfferChangeValid(role, body.offer, predecessorOrder.offer)) {
      ctx.throw(
        http.bad_request,
        language.pages.shop.messages.newOfferLowerThanPreviousOffer,
      );
    }
  }

  const { effectiveMsrp, productMsrpWeightsByOrderId } =
    await determineEffectiveMsrp(
      body.category,
      body.orderItems,
      productsById,
      requisitionConfig,
      relevantOrders,
    );
  if (!isOfferValid(body.offer, effectiveMsrp.monthly.total)) {
    ctx.throw(http.bad_request, "bid too low");
  }
  if (
    !isOfferReasonValid(
      body.offer,
      effectiveMsrp.monthly.total,
      body.offerReason,
    )
  ) {
    ctx.throw(http.bad_request, "no offer reason");
  }

  selectedOrder.offer = body.offer;
  selectedOrder.depotId = body.depotId;
  selectedOrder.alternateDepotId = body.alternateDepotId;
  selectedOrder.productConfiguration = ""; // storing this produces a lot of data in the database, so we don't do it anymore; JSON.stringify(productCategories);
  selectedOrder.offerReason = body.offerReason || "";
  selectedOrder.category = body.category;
  selectedOrder.categoryReason = body.categoryReason || "";
  if (!isEditedByOtherUser) {
    // only the user who has created the order can confirm it
    selectedOrder.confirmGTC = body.confirmGTC || false;
  }

  await AppDataSource.transaction(async (entityManager) => {
    // save order
    await entityManager.save(selectedOrder);
    for (const requestOrderItem of body.orderItems) {
      let item =
        selectedOrder.orderItems &&
        selectedOrder.orderItems.find(
          (orderItem) => orderItem.productId == requestOrderItem.productId,
        );

      const availability =
        productMsrpWeightsByOrderId[selectedOrder.id]?.[
          requestOrderItem.productId
        ] ?? 1;

      if (item) {
        item.value = requestOrderItem.value;
        item.availability = availability;
        await entityManager.save(item);
      } else {
        item = new OrderItem();
        item.productId = requestOrderItem.productId;
        item.orderId = selectedOrder.id;
        item.value = requestOrderItem.value;
        item.availability = availability;
        await entityManager.save(item);
      }
    }
    await entityManager.delete(OrderItem, { value: LessThan(1) });
  });

  // Send confirmation email to user (if option is set) and always to the EMAIL_ORDER_UPDATED_BCC (if set)
  await sendOrderConfirmationMail({
    order: selectedOrder,
    previousOrder: predecessorOrder ?? null,
    requestUserId,
    changingUserId: id,
    requisitionConfig,
    sendConfirmationEmailToUser,
    confirmSepaUpdate: body.confirmSepaUpdate,
    confirmBankTransfer: body.confirmBankTransfer,
    effectiveMsrp,
  });

  ctx.status = http.no_content;
};

const determineEffectiveMsrp = async (
  actualCategory: UserCategory,
  actualOrderItems: SharedOrderItem[],
  productsById: ProductsById,
  requisitionConfig: RequisitionConfig,
  orders: Order[],
): Promise<{
  effectiveMsrp: Msrp;
  productMsrpWeightsByOrderId: {
    [key: OrderId]: { [key: ProductId]: number };
  };
}> => {
  // replace the order items and the category in the newest order as this is the one
  // that is to be checked and saved
  const actualOrders = orders.map((order, index) => ({
    ...order,
    orderItems:
      index === orders.length - 1 ? actualOrderItems : order.orderItems,
    category: index === orders.length - 1 ? actualCategory : order.category,
  }));

  const productMsrpWeightsByOrderId: {
    [key: OrderId]: { [key: ProductId]: number };
  } = {};
  await Promise.all(
    actualOrders.map(async (order) => {
      const { msrpWeightsByProductId } = await availabilityWeights(
        requisitionConfig.id,
        order.validFrom,
      );
      productMsrpWeightsByOrderId[order.id] = msrpWeightsByProductId;
    }),
  );

  const rawMsrpsByOrderId: { [key: OrderId]: Msrp } = {};
  actualOrders.forEach(
    (order) =>
      (rawMsrpsByOrderId[order.id] = getMsrp(
        order.category,
        order.orderItems,
        productsById,
        calculateOrderValidMonths(
          order.validFrom,
          requisitionConfig.validTo,
          config.timezone,
        ),
        productMsrpWeightsByOrderId[order.id],
      )),
  );

  if (Object.keys(rawMsrpsByOrderId).length === 1) {
    // no predecessor order --> return the only raw MSRP as it is the effective MSRP
    return {
      effectiveMsrp: Object.values(rawMsrpsByOrderId)[0],
      productMsrpWeightsByOrderId,
    };
  }

  const result = calculateEffectiveMsrpChain(
    actualOrders,
    rawMsrpsByOrderId,
    productMsrpWeightsByOrderId,
    productsById,
  );

  return {
    effectiveMsrp: result[result.length - 1],
    productMsrpWeightsByOrderId,
  };
};
