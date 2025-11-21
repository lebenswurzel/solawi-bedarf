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
  AvailabilityWeights,
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
  Object.entries(ordersByUser).forEach(([userIdStr, _userOrders]) => {
    const userId = parseInt(userIdStr);
    const validOrder = getCurrentValidOrderForUser(orders, userId, targetDate);
    if (validOrder) {
      result[userId] = validOrder;
    }
  });

  return result;
};

export const availabilityWeightsHandler = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  await getUserFromContext(ctx);
  const configId = getConfigIdFromQuery(ctx);
  const dateOfInterest = getDateQueryParameter(
    ctx.request.query,
    "dateOfInterest",
  );

  ctx.body = await availabilityWeights(configId, dateOfInterest);
};

/**
 * Calculates the target date for the BI in case no explicit date of interest is provided.
 *
 * It is either now, the season start or the season end.
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

export const availabilityWeights = async (
  configId: number,
  dateOfInterest?: Date,
): Promise<AvailabilityWeights> => {
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

  const extendedShipmentsWhere = {
    validFrom: LessThan(targetDate),
  };

  const forecastShipments = await AppDataSource.getRepository(Shipment).find({
    relations: { shipmentItems: true },
    where: {
      requisitionConfigId: configId,
      ...extendedShipmentsWhere,
      validTo: MoreThan(new Date()), // use current date for finding forecast shipments
      type: ShipmentType.FORECAST,
      active: true,
    },
  });

  // console.log("forecastShipments", forecastShipments);

  const shipments = await AppDataSource.getRepository(Shipment).find({
    relations: { shipmentItems: true },
    where: {
      requisitionConfigId: configId,
      ...extendedShipmentsWhere,
      type: ShipmentType.NORMAL,
      active: true,
    },
    order: { validFrom: "ASC" },
  });

  const shipmentDates = shipments.map((shipment) => shipment.validFrom);
  shipmentDates.sort((a, b) => a.getTime() - b.getTime());

  const shipmentDatesMap = new Map<Date, Shipment[]>();
  shipmentDates.forEach((date) => {
    shipmentDatesMap.set(
      date,
      shipments.filter((shipment) => shipment.validFrom === date),
    );
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

  const itemsByProductIdShipmentId: AvailabilityWeights["itemsByProductIdShipmentId"] =
    {};
  const availabilityByProductId: AvailabilityWeights["availabilityByProductId"] =
    {};
  const msrpWeightsByProductId: AvailabilityWeights["msrpWeightsByProductId"] =
    {};

  shipments.forEach((shipment) => {
    const currentValidOrdersByUser = getCurrentValidOrdersByUser(
      orders,
      shipment.validFrom,
    );
    Object.values(currentValidOrdersByUser).forEach((order) =>
      order.orderItems.forEach((orderItem) => {
        if (!itemsByProductIdShipmentId[orderItem.productId]) {
          itemsByProductIdShipmentId[orderItem.productId] = {};
        }
        if (!itemsByProductIdShipmentId[orderItem.productId][shipment.id]) {
          itemsByProductIdShipmentId[orderItem.productId][shipment.id] = {
            delivered: 0,
            weightedDelivered: 0,
            depotIds: [],
            availability: 1,
          };
        }

        const shipmentItem = shipment.shipmentItems.find(
          (si) =>
            si.productId === orderItem.productId &&
            si.depotId === order.depotId,
        );

        const current =
          itemsByProductIdShipmentId[orderItem.productId][shipment.id];

        if (current.depotIds.includes(order.depotId)) {
          // already considered delivery for this depot, skip
          return;
        }

        const updatedDelivered =
          current.delivered + (shipmentItem?.multiplicator || 0);
        const updatedDepotIds = Array.from(
          new Set([...current.depotIds, order.depotId]),
        );

        itemsByProductIdShipmentId[orderItem.productId][shipment.id] = {
          ...current,
          delivered: updatedDelivered,
          depotIds: updatedDepotIds,
          weightedDelivered: updatedDelivered / updatedDepotIds.length,
        };
      }),
    );

    Object.entries(itemsByProductIdShipmentId).forEach(([productId, items]) => {
      const pid = parseInt(productId);
      const product = soldByProductId[pid];
      availabilityByProductId[pid] = {
        weightedDelivered: 0,
        frequency: product.frequency,
        deliveries: 0,
        deliveryPercentage: 0,
        roundedDeliveries: 0,
        msrpWeight: 0,
      };
      Object.values(items).forEach((item) => {
        availabilityByProductId[pid].weightedDelivered +=
          item.weightedDelivered;

        availabilityByProductId[pid].deliveries =
          availabilityByProductId[pid].weightedDelivered / 100;
        availabilityByProductId[pid].roundedDeliveries = Math.round(
          availabilityByProductId[pid].deliveries,
        );
        availabilityByProductId[pid].deliveryPercentage =
          availabilityByProductId[pid].weightedDelivered / product.frequency;

        const msrpWeight = Math.min(
          Math.max(
            1 -
              availabilityByProductId[parseInt(productId)].weightedDelivered /
                (product.frequency * 100),
            0,
          ),
          1,
        );

        availabilityByProductId[parseInt(productId)].msrpWeight = msrpWeight;
        msrpWeightsByProductId[parseInt(productId)] = msrpWeight;
      });
    });
  });

  return {
    itemsByProductIdShipmentId,
    availabilityByProductId,
    msrpWeightsByProductId,
  };
};
