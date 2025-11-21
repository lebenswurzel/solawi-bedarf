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
  ProductId,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import Koa from "koa";
import Router from "koa-router";
import { LessThan, MoreThan } from "typeorm";
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

interface ItemType {
  delivered: number;
  weightedDelivered: number;
  depotIds: number[];
  availability: number;
}
interface ItemsByProductIdShipmentId {
  [productId: ProductId]: {
    [shipmentId: number]: ItemType;
  };
}

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

  ctx.body = await availabilityWeights(
    configId,
    dateOfInterest,
    includeForecast,
  );
};

export const availabilityWeights = async (
  configId: number,
  dateOfInterest?: Date,
  includeForecast: boolean = false,
): Promise<AvailabilityWeights> => {
  const targetDate = dateOfInterest || (await determineTargetDate(configId));

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

  let forecastShipments: Shipment[] = [];
  if (includeForecast) {
    forecastShipments = await AppDataSource.getRepository(Shipment).find({
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

  const shipments = await AppDataSource.getRepository(Shipment).find({
    relations: { shipmentItems: true },
    where: {
      requisitionConfigId: configId,
      validFrom: LessThan(targetDate),
      type: ShipmentType.NORMAL,
      active: true,
    },
    order: { validFrom: "ASC" },
  });

  const productFrequencyByProductId: { [productId: number]: number } = {};

  productCategories.forEach((productCategory) =>
    productCategory.products.forEach((product) => {
      productFrequencyByProductId[product.id] = product.frequency;
    }),
  );

  const itemsByProductIdShipmentId: ItemsByProductIdShipmentId = {};
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
  });

  Object.entries(itemsByProductIdShipmentId).forEach(([productId, items]) => {
    const pid = parseInt(productId);
    const frequency = productFrequencyByProductId[pid];
    availabilityByProductId[pid] = {
      weightedDelivered: 0,
      frequency: frequency,
      deliveries: 0,
      deliveryPercentage: 0,
      roundedDeliveries: 0,
      msrpWeight: 0,
    };
    (Object.values(items) as ItemType[]).forEach((item) => {
      availabilityByProductId[pid].weightedDelivered += item.weightedDelivered;

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
            availabilityByProductId[parseInt(productId)].weightedDelivered /
              (frequency * 100),
          0,
        ),
        1,
      );

      availabilityByProductId[parseInt(productId)].msrpWeight = msrpWeight;
      msrpWeightsByProductId[parseInt(productId)] = msrpWeight;
    });
  });

  return {
    availabilityByProductId,
    msrpWeightsByProductId,
  };
};
