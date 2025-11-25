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
import { ShipmentType } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import {
  AvailabilityWeights,
  DeliveredByProductIdDepotId,
  ProductId,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import Koa from "koa";
import Router from "koa-router";
import { EntityManager, LessThan, MoreThan } from "typeorm";
import { Order } from "../../database/Order";
import { ProductCategory } from "../../database/ProductCategory";
import { Shipment } from "../../database/Shipment";
import { AppDataSource } from "../../database/database";
import {
  getBooleanQueryParameter,
  getConfigIdFromQuery,
  getDateQueryParameter,
} from "../../util/requestUtil";
import { getAdjustedForecastShipments } from "../../util/shipmentUtil";
import { getUserFromContext } from "../getUserFromContext";
import { determineTargetDate, getCurrentValidOrders } from "./bi";
import { Depot } from "../../database/Depot";

interface ItemType {
  delivered: number;
  weightedDelivered: number;
  depotIds: number[];
  availability: number;
}
interface ItemsByShipmentIdProductId {
  [shipmentId: number]: {
    [productId: ProductId]: ItemType;
  };
}

// helper function that coerces to the nearest mulitple of 50
const coerceToNearestMultipleOf50 = (value: number) => {
  return Math.round(value / 50) * 50;
};

export const availabilityWeightsHandler = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  await getUserFromContext(ctx);
  const configId = getConfigIdFromQuery(ctx);
  const dateOfInterest = getDateQueryParameter(
    ctx.request.query,
    "dateOfInterest",
    undefined,
  );
  const includeForecast = getBooleanQueryParameter(
    ctx.request.query,
    "includeForecast",
    false,
  );
  const includeDeliveryStats = getBooleanQueryParameter(
    ctx.request.query,
    "includeDeliveryStats",
    false,
  );

  ctx.body = await availabilityWeights(
    configId,
    dateOfInterest,
    includeForecast,
    includeDeliveryStats,
  );
};

export const availabilityWeights = async (
  configId: number,
  dateOfInterest?: Date,
  includeForecast: boolean = false,
  includeDeliveryStats: boolean = false,
  entityManager?: EntityManager,
): Promise<AvailabilityWeights> => {
  const dataSource = entityManager ? entityManager : AppDataSource;
  const targetDate =
    dateOfInterest || (await determineTargetDate(configId, entityManager));

  const depots = await dataSource.getRepository(Depot).find({
    where: {
      active: true,
    },
  });
  const depotIds = depots.map((depot) => depot.id);

  const orders = await dataSource.getRepository(Order).find({
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
  const productCategories = await dataSource
    .getRepository(ProductCategory)
    .find({
      relations: { products: true },
      where: { requisitionConfigId: configId },
    });

  let forecastShipments: Shipment[] = [];
  if (includeForecast) {
    forecastShipments = await dataSource.getRepository(Shipment).find({
      relations: { shipmentItems: true },
      where: {
        requisitionConfigId: configId,
        validFrom: LessThan(targetDate),
        validTo: MoreThan(new Date()),
        type: ShipmentType.FORECAST,
        active: true,
      },
    });
  }

  const shipments = await dataSource.getRepository(Shipment).find({
    relations: { shipmentItems: true },
    where: {
      requisitionConfigId: configId,
      validFrom: LessThan(targetDate),
      type: ShipmentType.NORMAL,
      active: true,
    },
    order: { validFrom: "ASC" },
  });

  const deliveredByProductIdDepotId: DeliveredByProductIdDepotId = {};
  const productFrequencyByProductId: { [productId: number]: number } = {};

  productCategories.forEach((productCategory) =>
    productCategory.products.forEach((product) => {
      productFrequencyByProductId[product.id] = product.frequency;
    }),
  );

  const itemsByShipmentIdProductId: ItemsByShipmentIdProductId = {};
  const availabilityByProductId: AvailabilityWeights["availabilityByProductId"] =
    {};
  const msrpWeightsByProductId: AvailabilityWeights["msrpWeightsByProductId"] =
    {};

  const allShipments = shipments.concat(
    getAdjustedForecastShipments(shipments, forecastShipments),
  );

  allShipments.forEach((shipment) => {
    const currentValidOrders = getCurrentValidOrders(
      orders,
      shipment.validFrom,
    );
    currentValidOrders.forEach((order) =>
      order.orderItems.forEach((orderItem) => {
        const productId = orderItem.productId;
        if (!itemsByShipmentIdProductId[shipment.id]) {
          itemsByShipmentIdProductId[shipment.id] = {};
        }
        if (!itemsByShipmentIdProductId[shipment.id][productId]) {
          itemsByShipmentIdProductId[shipment.id][productId] = {
            delivered: 0,
            weightedDelivered: 0,
            depotIds: [],
            availability: 1,
          };
        }

        const current = itemsByShipmentIdProductId[shipment.id][productId];

        if (current.depotIds.includes(order.depotId)) {
          // already considered delivery for this depot, skip
          return;
        }

        const shipmentItem = shipment.shipmentItems.find(
          (si) =>
            si.productId === orderItem.productId &&
            si.depotId === order.depotId,
        );

        const updatedDelivered =
          current.delivered + (shipmentItem?.multiplicator || 0);
        const updatedDepotIds = Array.from(
          new Set([...current.depotIds, order.depotId]),
        );

        itemsByShipmentIdProductId[shipment.id][productId] = {
          ...current,
          delivered: updatedDelivered,
          depotIds: updatedDepotIds,
          weightedDelivered: updatedDelivered / updatedDepotIds.length,
        };
      }),
    );
    // determine product delivered amount for each depot
    if (includeDeliveryStats) {
      depotIds.forEach((depotId) => {
        const consideredAssumedShipmentProductIds = new Set<ProductId>();
        shipment.shipmentItems.forEach((shipmentItem) => {
          if (!deliveredByProductIdDepotId[shipmentItem.productId]) {
            deliveredByProductIdDepotId[shipmentItem.productId] = {};
          }
          if (!deliveredByProductIdDepotId[shipmentItem.productId][depotId]) {
            deliveredByProductIdDepotId[shipmentItem.productId][depotId] = {
              actuallyDelivered: undefined,
              assumedDelivered: 0,
              frequency: productFrequencyByProductId[shipmentItem.productId],
              deliveryCount: 0,
            };
          }

          const item =
            itemsByShipmentIdProductId[shipment.id][shipmentItem.productId];
          if (
            !item.depotIds.includes(depotId) &&
            !consideredAssumedShipmentProductIds.has(shipmentItem.productId)
          ) {
            deliveredByProductIdDepotId[shipmentItem.productId][
              depotId
            ].assumedDelivered += coerceToNearestMultipleOf50(
              item.weightedDelivered,
            );
            consideredAssumedShipmentProductIds.add(shipmentItem.productId);
          } else if (
            shipmentItem.depotId == depotId &&
            item.depotIds.includes(depotId)
          ) {
            deliveredByProductIdDepotId[shipmentItem.productId][
              depotId
            ].actuallyDelivered =
              (deliveredByProductIdDepotId[shipmentItem.productId][depotId]
                ?.actuallyDelivered || 0) + shipmentItem.multiplicator;
            deliveredByProductIdDepotId[shipmentItem.productId][depotId]
              .deliveryCount++;
          }
        });
      });
    }
  });

  // aggregate product availability for each product
  Object.entries(itemsByShipmentIdProductId).forEach(
    ([_shipmentId, itemsByProductId]) => {
      Object.entries(itemsByProductId).forEach(([productId, item]) => {
        const pid = parseInt(productId);
        const frequency = productFrequencyByProductId[pid];
        const typedItem = item as ItemType;
        if (!availabilityByProductId[pid]) {
          availabilityByProductId[pid] = {
            weightedDelivered: 0,
            frequency: frequency,
            deliveries: 0,
            deliveryPercentage: 0,
            roundedDeliveries: 0,
            msrpWeight: 0,
          };
        }
        availabilityByProductId[pid].weightedDelivered +=
          typedItem.weightedDelivered;

        availabilityByProductId[pid].deliveries =
          availabilityByProductId[pid].weightedDelivered / 100;
        availabilityByProductId[pid].roundedDeliveries = Math.round(
          availabilityByProductId[pid].deliveries,
        );
        availabilityByProductId[pid].deliveryPercentage =
          availabilityByProductId[pid].weightedDelivered / frequency;

        const msrpWeight = Math.min(
          Math.max(
            1 -
              availabilityByProductId[pid].weightedDelivered /
                (frequency * 100),
            0,
          ),
          1,
        );

        availabilityByProductId[pid].msrpWeight = msrpWeight;
        msrpWeightsByProductId[pid] = msrpWeight;
      });
    },
  );

  return {
    availabilityByProductId,
    msrpWeightsByProductId,
    deliveredByProductIdDepotId,
  };
};
