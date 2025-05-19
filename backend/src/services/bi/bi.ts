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
  getNumericQueryParameter,
} from "../../util/requestUtil";
import { LessThan, MoreThan } from "typeorm";
import { mergeShipmentWithForecast } from "../../util/shipmentUtil";

export const biHandler = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  await getUserFromContext(ctx);
  const configId = getConfigIdFromQuery(ctx);
  const requestUserId =
    getNumericQueryParameter(ctx.request.query, "userId", 0) || undefined;
  const includeForecast = getBooleanQueryParameter(
    ctx.request.query,
    "includeForecast",
    false,
  );
  ctx.body = await bi(configId, requestUserId, includeForecast);
};

export const bi = async (
  configId: number,
  requestUserId?: number,
  includeForecast: boolean = false,
) => {
  const now = new Date();
  const depots = await AppDataSource.getRepository(Depot).find();

  const orders = await AppDataSource.getRepository(Order).find({
    relations: { orderItems: true },
    select: {
      offer: true,
      depotId: true,
      userId: true,
      validFrom: true,
      orderItems: {
        value: true,
        productId: true,
      },
    },
    where: {
      requisitionConfigId: configId,
    },
  });
  const productCategories = await AppDataSource.getRepository(
    ProductCategory,
  ).find({
    relations: { products: true },
    where: { requisitionConfigId: configId },
  });

  let extendedShipmentsWhere = {};
  let forecastShipments: Shipment[] = [];

  if (requestUserId) {
    const userOrder = orders.find((o) => o.userId === requestUserId);
    if (userOrder && userOrder.validFrom) {
      console.log("shipments before validFrom", userOrder.validFrom);
      extendedShipmentsWhere = {
        validFrom: LessThan(userOrder.validFrom),
      };

      if (includeForecast) {
        forecastShipments = await AppDataSource.getRepository(Shipment).find({
          relations: { shipmentItems: true },
          where: {
            requisitionConfigId: configId,
            ...extendedShipmentsWhere,
            validTo: MoreThan(now),
            type: ShipmentType.FORECAST,
            active: true,
          },
        });
      }
    }
  }

  console.log("forecastShipments", forecastShipments);

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

  orders.forEach((order) =>
    order.orderItems.forEach((orderItem) => {
      const product = soldByProductId[orderItem.productId];
      soldByProductId[orderItem.productId].sold +=
        orderItem.value * product.frequency;
      if (order.validFrom && order.validFrom < now) {
        soldByProductId[orderItem.productId].soldForShipment +=
          orderItem.value * product.frequency;
      }
    }),
  );

  orders.forEach((order) =>
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
      if (order.validFrom && order.validFrom < now) {
        deliveredByProductIdDepotId[orderItem.productId][
          order.depotId
        ].valueForShipment += orderItem.value;
      }
    }),
  );

  orders.forEach((order) => {
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
    offers: orders.reduce((acc, cur) => acc + cur.offer, 0),
  };
};
