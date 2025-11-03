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
import {
  ShipmentType,
  Unit,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import {
  BIData,
  CapacityByDepotId,
  DeliveredByProductIdDepotId,
  ProductsById,
  SoldByProductId,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { Depot } from "../../database/Depot";
import { Order } from "../../database/Order";
import { ProductCategory } from "../../database/ProductCategory";
import { Shipment } from "../../database/Shipment";
import { AppDataSource } from "../../database/database";
import { getUserFromContext } from "../getUserFromContext";
import {
  getBooleanQueryParameter,
  getConfigIdFromQuery,
  getDateQueryParameter,
  getNumericQueryParameter,
} from "../../util/requestUtil";
import { LessThan, MoreThan } from "typeorm";
import { mergeShipmentWithForecast } from "../../util/shipmentUtil";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import {
  getSameOrNextThursday,
  getSameOrPreviousThursday,
} from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper";

const isOrderValidOnDate = (order: Order, targetDate: Date): boolean => {
  return order.validFrom <= targetDate && order.validTo > targetDate;
};

/**
 * Finds the valid order for a specific user at a specific date.
 * Returns the order that was valid at the given date based on validFrom and validTo.
 */
const findValidOrderForUserAtDate = (
  orders: Order[],
  userId: number,
  targetDate: Date,
): Order | null => {
  const userOrders = orders.filter((o) => o.userId === userId);

  // Find the order that was valid at the target date
  return (
    userOrders.find((order) => isOrderValidOnDate(order, targetDate)) || null
  );
};

/**
 * Gets the currently valid order for a user (validTo is null or in the future).
 */
const getCurrentValidOrderForUser = (
  orders: Order[],
  userId: number,
  targetDate: Date,
): Order | null => {
  return findValidOrderForUserAtDate(orders, userId, targetDate);
};

/**
 * Groups orders by user and returns the currently valid order for each user.
 */
const getCurrentValidOrdersByUser = (
  orders: Order[],
  targetDate: Date,
): { [userId: number]: Order } => {
  const result: { [userId: number]: Order } = {};

  // Group orders by user
  const ordersByUser: { [userId: number]: Order[] } = {};
  orders.forEach((order) => {
    if (!ordersByUser[order.userId]) {
      ordersByUser[order.userId] = [];
    }
    ordersByUser[order.userId].push(order);
  });

  // Find current valid order for each user
  Object.entries(ordersByUser).forEach(([userIdStr, userOrders]) => {
    const userId = parseInt(userIdStr);
    const validOrder = getCurrentValidOrderForUser(orders, userId, targetDate);
    if (validOrder) {
      result[userId] = validOrder;
    }
  });

  return result;
};

export const biHandler = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  await getUserFromContext(ctx);
  const configId = getConfigIdFromQuery(ctx);
  const orderId = getNumericQueryParameter(ctx.request.query, "orderId", 0);
  const includeForecast = getBooleanQueryParameter(
    ctx.request.query,
    "includeForecast",
    false,
  );
  const dateOfInterest = getDateQueryParameter(
    ctx.request.query,
    "dateOfInterest",
  );

  let orderValidFrom = undefined;
  if (orderId) {
    const userOrder = await AppDataSource.getRepository(Order).findOne({
      where: { id: orderId, requisitionConfigId: configId },
    });
    if (!userOrder) {
      throw new Error(`Order ${orderId} not found in season ${configId}`);
    }
    orderValidFrom = userOrder.validFrom;
  }
  ctx.body = await bi(
    configId,
    orderValidFrom,
    includeForecast,
    dateOfInterest,
  );
};

/**
 * Calculates the target date for the BI in case no explicit date of interest is provided.
 */
const determineTargetDate = async (configId: number): Promise<Date> => {
  const config = await AppDataSource.getRepository(RequisitionConfig).findOne({
    where: { id: configId },
  });
  if (!config) {
    throw new Error(`Config ${configId} not found`);
  }
  const now = new Date();
  if (now < config.validFrom) {
    // if the current date is before the season start, use the season start
    return getSameOrNextThursday(config.validFrom);
  } else if (now > config.validTo) {
    // if the current date is after the season end, use the season end
    return getSameOrPreviousThursday(config.validTo);
  }
  return now;
};

export const bi = async (
  configId: number,
  orderValidFrom?: Date,
  includeForecast: boolean = false,
  dateOfInterest?: Date,
): Promise<BIData> => {
  const targetDate = dateOfInterest || (await determineTargetDate(configId));
  const depots = await AppDataSource.getRepository(Depot).find();

  const orders = await AppDataSource.getRepository(Order).find({
    relations: { orderItems: true },
    select: {
      offer: true,
      depotId: true,
      userId: true,
      validFrom: true,
      validTo: true,
      orderItems: {
        value: true,
        productId: true,
      },
    },
    where: {
      requisitionConfigId: configId,
      confirmGTC: true,
    },
    order: { userId: "ASC", validFrom: "ASC" }, // Order by user and then by validity
  });
  const productCategories = await AppDataSource.getRepository(
    ProductCategory,
  ).find({
    relations: { products: true },
    where: { requisitionConfigId: configId },
  });

  let extendedShipmentsWhere = {
    validFrom: LessThan(targetDate),
  };
  let forecastShipments: Shipment[] = [];

  if (orderValidFrom) {
    // console.log("shipments before validFrom", userOrder.validFrom);
    extendedShipmentsWhere = {
      validFrom: LessThan(orderValidFrom),
    };

    if (includeForecast) {
      forecastShipments = await AppDataSource.getRepository(Shipment).find({
        relations: { shipmentItems: true },
        where: {
          requisitionConfigId: configId,
          ...extendedShipmentsWhere,
          validTo: MoreThan(new Date()), // use current date for finding forecast shipments
          type: ShipmentType.FORECAST,
          active: true,
        },
      });
    }
  }

  // console.log("forecastShipments", forecastShipments);

  const shipments = await AppDataSource.getRepository(Shipment).find({
    relations: { shipmentItems: true },
    where: {
      requisitionConfigId: configId,
      ...extendedShipmentsWhere,
      type: ShipmentType.NORMAL,
      active: true,
    },
  });

  const soldByProductId: SoldByProductId = {};
  const deliveredByProductIdDepotId: DeliveredByProductIdDepotId = {};
  const capacityByDepotId: CapacityByDepotId = {};

  depots.forEach((depot) => {
    capacityByDepotId[depot.id] = {
      capacity: depot.capacity,
      reserved: 0,
      userIds: [],
    };
  });

  productCategories.forEach((productCategory) =>
    productCategory.products.forEach((product) => {
      soldByProductId[product.id] = {
        quantity: product.quantity * (product.unit == Unit.PIECE ? 1 : 1000),
        sold: 0,
        soldForShipment: 0,
        frequency: product.frequency,
      };
    }),
  );

  // Use only currently valid orders for sold calculations
  const currentValidOrdersByUser = getCurrentValidOrdersByUser(
    orders,
    targetDate,
  );
  Object.values(currentValidOrdersByUser).forEach((order) =>
    order.orderItems.forEach((orderItem) => {
      const product = soldByProductId[orderItem.productId];
      soldByProductId[orderItem.productId].sold +=
        orderItem.value * product.frequency;
      if (isOrderValidOnDate(order, targetDate)) {
        soldByProductId[orderItem.productId].soldForShipment +=
          orderItem.value * product.frequency;
      }
    }),
  );

  // Use only currently valid orders for delivery calculations
  Object.values(currentValidOrdersByUser).forEach((order) =>
    order.orderItems.forEach((orderItem) => {
      const product = soldByProductId[orderItem.productId];
      if (!deliveredByProductIdDepotId[orderItem.productId]) {
        deliveredByProductIdDepotId[orderItem.productId] = {};
      }
      if (!deliveredByProductIdDepotId[orderItem.productId][order.depotId]) {
        deliveredByProductIdDepotId[orderItem.productId][order.depotId] = {
          value: 0,
          valueForShipment: 0,
          actuallyDelivered: 0,
          frequency: product.frequency,
          deliveryCount: 0,
        };
      }
      deliveredByProductIdDepotId[orderItem.productId][order.depotId].value +=
        orderItem.value;
      if (isOrderValidOnDate(order, targetDate)) {
        deliveredByProductIdDepotId[orderItem.productId][
          order.depotId
        ].valueForShipment += orderItem.value;
      }
    }),
  );

  // Use only currently valid orders for depot capacity calculations
  Object.values(currentValidOrdersByUser).forEach((order) => {
    if (order.depotId) {
      if (
        !capacityByDepotId[order.depotId].userIds.includes(order.userId) &&
        order.orderItems.length > 0
      ) {
        // only consider orders that actually have items when counting depot occupancy
        capacityByDepotId[order.depotId].userIds.push(order.userId);
      }
    }
  });

  mergeShipmentWithForecast(shipments, forecastShipments).forEach(
    (shipmentItem) => {
      const product = soldByProductId[shipmentItem.productId];
      if (!deliveredByProductIdDepotId[shipmentItem.productId]) {
        deliveredByProductIdDepotId[shipmentItem.productId] = {};
      }
      if (
        !deliveredByProductIdDepotId[shipmentItem.productId][
          shipmentItem.depotId
        ]
      ) {
        deliveredByProductIdDepotId[shipmentItem.productId][
          shipmentItem.depotId
        ] = {
          value: 0,
          valueForShipment: 0,
          actuallyDelivered: 0,
          frequency: product.frequency,
          deliveryCount: 0,
        };
      }

      deliveredByProductIdDepotId[shipmentItem.productId][
        shipmentItem.depotId
      ].actuallyDelivered += shipmentItem.multiplicator;
      deliveredByProductIdDepotId[shipmentItem.productId][shipmentItem.depotId]
        .deliveryCount++;
    },
  );

  // clean the data
  Object.keys(capacityByDepotId).forEach((key) => {
    const depotId = parseInt(key);
    const capacityByDepot = capacityByDepotId[depotId];
    capacityByDepotId[depotId] = {
      capacity: capacityByDepot.capacity,
      reserved: capacityByDepot.userIds.length,
      userIds: [],
    };
  });

  const productsById: ProductsById = productCategories
    .map((productCategory) =>
      productCategory.products.map((product) => ({
        ...product,
        active: productCategory.active && product.active,
        productCategoryType: productCategory.typ,
      })),
    )
    .flat()
    .reduce((acc, cur) => {
      acc[cur.id] = cur;
      return acc;
    }, {} as ProductsById);

  return {
    soldByProductId,
    deliveredByProductIdDepotId,
    capacityByDepotId,
    productsById,
    offers: Object.values(currentValidOrdersByUser).reduce(
      (acc, cur) => acc + cur.offer,
      0,
    ),
  };
};
