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
import { expect, test } from "vitest";
import { addDays, subDays } from "date-fns";
import {
  ProductCategoryType,
  ShipmentType,
  Unit,
  UserCategory,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { AppDataSource } from "../../database/database";
import { Depot } from "../../database/Depot";
import { Order } from "../../database/Order";
import { OrderItem } from "../../database/OrderItem";
import { Product } from "../../database/Product";
import { ProductCategory } from "../../database/ProductCategory";
import { Shipment } from "../../database/Shipment";
import { ShipmentItem } from "../../database/ShipmentItem";
import {
  getRequisitionConfigId,
  updateRequisition,
} from "../../../test/testHelpers";
import { getUserId, testAsUser1, TestUserData } from "../../../testSetup";
import { bi } from "./bi";
import { RequisitionConfig } from "../../database/RequisitionConfig";

/**
 * Creates and saves a test Depot entity
 */
export const createTestDepot = async (options?: {
  name?: string;
  capacity?: number | null;
  active?: boolean;
  rank?: number;
}): Promise<Depot> => {
  const depot = new Depot();
  depot.name = options?.name ?? "Test Depot";
  depot.address = `${depot.name} address`;
  depot.openingHours = "9-5";
  depot.capacity = options?.capacity ?? 10;
  depot.active = options?.active ?? true;
  depot.rank = options?.rank ?? 1;
  depot.comment = "Test Depot Comment";

  return await AppDataSource.getRepository(Depot).save(depot);
};

/**
 * Creates and saves a test ProductCategory entity
 */
export const createTestProductCategory = async (options?: {
  name?: string;
  active?: boolean;
  requisitionConfigId?: number;
  typ?: ProductCategoryType;
}): Promise<ProductCategory> => {
  const configId =
    options?.requisitionConfigId ?? (await getRequisitionConfigId());
  const productCategory = new ProductCategory();
  productCategory.name = options?.name ?? "Test Category";
  productCategory.active = options?.active ?? true;
  productCategory.requisitionConfigId = configId;
  productCategory.typ = options?.typ ?? ProductCategoryType.SELFGROWN;

  return await AppDataSource.getRepository(ProductCategory).save(
    productCategory,
  );
};

/**
 * Creates and saves a test Product entity
 */
export const createTestProduct = async (options?: {
  name?: string;
  quantity?: number;
  frequency?: number;
  unit?: Unit;
  productCategoryId?: number;
  active?: boolean;
}): Promise<Product> => {
  let productCategoryId = options?.productCategoryId;
  if (!productCategoryId) {
    const category = await createTestProductCategory();
    productCategoryId = category.id;
  }

  const product = new Product();
  product.name = options?.name ?? "Test Product";
  product.description = `Description of ${product.name}`;
  product.active = options?.active ?? true;
  product.msrp = 250;
  product.quantity = options?.quantity ?? 100;
  product.quantityMin = 1;
  product.quantityMax = 5;
  product.quantityStep = 1;
  product.frequency = options?.frequency ?? 20;
  product.unit = options?.unit ?? Unit.PIECE;
  product.productCategoryId = productCategoryId;

  return await AppDataSource.getRepository(Product).save(product);
};

/**
 * Creates and saves a test Order entity with OrderItems
 */
export const createTestOrder = async (options?: {
  userId?: number;
  depotId?: number;
  requisitionConfigId?: number;
  validFrom?: Date;
  validTo?: Date;
  confirmGTC?: boolean;
  offer?: number;
  orderItems?: Array<{
    productId: number;
    value: number;
    availability?: number;
  }>;
}): Promise<Order> => {
  const configId =
    options?.requisitionConfigId ?? (await getRequisitionConfigId());
  const userId = options?.userId ?? (await getUserId("user1"));

  const config = await AppDataSource.getRepository(
    RequisitionConfig,
  ).findOneByOrFail({ id: configId });
  const validFrom = options?.validFrom ?? config.validFrom;
  const validTo = options?.validTo ?? config.validTo;

  // Create depot if not provided
  let depotId = options?.depotId;
  if (!depotId) {
    const depot = await createTestDepot();
    depotId = depot.id;
  }

  const now = new Date();
  const order = new Order();
  order.userId = userId;
  order.depotId = depotId;
  order.requisitionConfigId = configId;
  order.validFrom = validFrom;
  order.validTo = validTo;
  order.confirmGTC = options?.confirmGTC ?? true;
  order.offer = options?.offer ?? 0;
  order.offerReason = null;
  order.category = UserCategory.CAT100;
  order.categoryReason = null;
  order.productConfiguration = "{}";
  order.alternateDepotId = null;

  const savedOrder = await AppDataSource.getRepository(Order).save(order);

  // Create OrderItems if provided
  if (options?.orderItems && options.orderItems.length > 0) {
    const orderItems = options.orderItems.map((item) => {
      const orderItem = new OrderItem();
      orderItem.orderId = savedOrder.id;
      orderItem.productId = item.productId;
      orderItem.value = item.value;
      orderItem.availability = item.availability ?? 1;
      return orderItem;
    });

    await AppDataSource.getRepository(OrderItem).save(orderItems);
    savedOrder.orderItems = orderItems;
  } else {
    savedOrder.orderItems = [];
  }

  return savedOrder;
};

/**
 * Creates and saves a test Shipment entity
 */
export const createTestShipment = async (options?: {
  requisitionConfigId?: number;
  validFrom?: Date;
  active?: boolean;
  type?: ShipmentType;
  description?: string | null;
  validTo?: Date | null;
}): Promise<Shipment> => {
  const configId =
    options?.requisitionConfigId ?? (await getRequisitionConfigId());
  const shipment = new Shipment();
  shipment.requisitionConfigId = configId;
  shipment.validFrom = options?.validFrom ?? new Date();
  shipment.active = options?.active ?? false;
  shipment.type = options?.type ?? ShipmentType.NORMAL;
  shipment.description = options?.description ?? null;
  shipment.validTo = options?.validTo ?? undefined;
  shipment.revisionMessages = null;

  return await AppDataSource.getRepository(Shipment).save(shipment);
};

/**
 * Creates and saves a test ShipmentItem entity
 */
export const createTestShipmentItem = async (options: {
  shipmentId: number;
  productId: number;
  depotId: number;
  multiplicator?: number;
  totalShipedQuantity?: number;
  unit?: Unit;
  description?: string | null;
  isBio?: boolean;
  conversionFrom?: number;
  conversionTo?: number;
}): Promise<ShipmentItem> => {
  const shipmentItem = new ShipmentItem();
  shipmentItem.shipmentId = options.shipmentId;
  shipmentItem.productId = options.productId;
  shipmentItem.depotId = options.depotId;
  shipmentItem.multiplicator = options.multiplicator ?? 100;
  shipmentItem.totalShipedQuantity = options.totalShipedQuantity ?? 1;
  shipmentItem.unit = options.unit ?? Unit.PIECE;
  shipmentItem.description = options.description ?? null;
  shipmentItem.isBio = options.isBio ?? true;
  shipmentItem.conversionFrom = options.conversionFrom ?? 1;
  shipmentItem.conversionTo = options.conversionTo ?? 1;

  return await AppDataSource.getRepository(ShipmentItem).save(shipmentItem);
};

testAsUser1(
  "bi with 1 order, 1 orderItem, 1 shipment, 1 shipmentItem",
  async ({ userData }: TestUserData) => {
    const now = new Date();
    const configId = await updateRequisition(
      true,
      undefined,
      undefined,
      subDays(now, 100),
      addDays(now, 265),
    );

    // Create product category and product
    const category = await createTestProductCategory({
      requisitionConfigId: configId,
    });
    const product = await createTestProduct({
      name: "Test Product",
      quantity: 100,
      frequency: 20,
      unit: Unit.PIECE,
      productCategoryId: category.id,
    });

    // Create depot
    const depot = await createTestDepot({
      name: "Test Depot",
      capacity: 10,
    });

    // Create order with 1 orderItem
    const order = await createTestOrder({
      userId: userData.userId,
      depotId: depot.id,
      requisitionConfigId: configId,
      confirmGTC: true,
      offer: 10,
      orderItems: [
        {
          productId: product.id,
          value: 5, // 5 pieces ordered
          availability: 1,
        },
      ],
    });

    // Create shipment with 1 shipmentItem
    const shipment = await createTestShipment({
      requisitionConfigId: configId,
      validFrom: subDays(now, 2), // Shipment from 2 days ago (before targetDate)
      active: true, // Must be active to be included
      type: ShipmentType.NORMAL,
    });

    await createTestShipmentItem({
      shipmentId: shipment.id,
      productId: product.id,
      depotId: depot.id,
      multiplicator: 100, // 100% delivered
      totalShipedQuantity: 5,
      unit: Unit.PIECE,
    });

    // Call bi function
    const result = await bi(configId, undefined, false, now);

    // Verify soldByProductId
    expect(result.soldByProductId[product.id]).toBeDefined();
    expect(result.soldByProductId[product.id].sold).toBe(100); // 5 * 20 frequency
    expect(result.soldByProductId[product.id].soldForShipment).toBe(100); // Order is valid on targetDate
    expect(result.soldByProductId[product.id].quantity).toBe(100); // product.quantity * 1 (PIECE unit)
    expect(result.soldByProductId[product.id].frequency).toBe(20);

    // Verify deliveredByProductIdDepotId
    expect(
      result.deliveredByProductIdDepotId[product.id][depot.id],
    ).toBeDefined();
    expect(result.deliveredByProductIdDepotId[product.id][depot.id].value).toBe(
      5,
    ); // orderItem.value
    expect(
      result.deliveredByProductIdDepotId[product.id][depot.id].valueForShipment,
    ).toBe(5); // Order is valid on targetDate
    expect(
      result.deliveredByProductIdDepotId[product.id][depot.id]
        .actuallyDelivered,
    ).toBe(100); // shipmentItem.multiplicator
    expect(
      result.deliveredByProductIdDepotId[product.id][depot.id].frequency,
    ).toBe(20);
    expect(
      result.deliveredByProductIdDepotId[product.id][depot.id].deliveryCount,
    ).toBe(1);

    // Verify capacityByDepotId
    expect(result.capacityByDepotId[depot.id]).toBeDefined();
    expect(result.capacityByDepotId[depot.id].capacity).toBe(10);
    expect(result.capacityByDepotId[depot.id].reserved).toBe(1); // 1 user

    // Verify offers
    expect(result.offers).toBe(10); // order.offer

    // Verify productsById
    expect(result.productsById[product.id]).toBeDefined();
    expect(result.productsById[product.id].id).toBe(product.id);
    expect(result.productsById[product.id].name).toBe("Test Product");
  },
);
