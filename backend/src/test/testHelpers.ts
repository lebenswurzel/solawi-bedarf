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
import { Unit } from "../../../shared/src/enum";
import { Depot } from "../database/Depot";
import { Order } from "../database/Order";
import { OrderItem } from "../database/OrderItem";
import { Product } from "../database/Product";
import { ProductCategory } from "../database/ProductCategory";
import {
  RequisitionConfig,
  RequisitionConfigName,
} from "../database/RequisitionConfig";
import { AppDataSource } from "../database/database";

export const fillDatabaseWithTestData = async () => {
  const products = ["p1", "p2", "p3", "p4"];
  const depots = ["d1", "d2", "d3"];

  for (const depot of depots) {
    await createTestDepot(depot);
  }
  for (const product of products) {
    await createTestProduct(product);
  }
};

const createTestDepot = async (name: string) => {
  AppDataSource.getRepository(Depot).save({
    name,
    address: `${name} address`,
    openingHours: "9-5",
    capacity: 12,
    active: true,
  });
};

const createTestProduct = async (name: string) => {
  const pcEntity = await AppDataSource.getRepository(ProductCategory).save({
    name: `${name} category`,
    active: true,
  });
  await AppDataSource.getRepository(Product).save({
    name,
    description: `description of product ${name}`,
    active: true,
    msrp: 250,
    quantity: 100,
    quantityMin: 1,
    frequency: 20,
    quantityMax: 5,
    quantityStep: 1,
    unit: Unit.PIECE,
    orderItems: [],
    productCategoryId: pcEntity.id,
  });
};

export const updateRequisition = async (
  biddingOpen: boolean,
  increaseOnly?: boolean,
  requistionName?: string,
) => {
  increaseOnly = increaseOnly || false;
  const now = new Date();
  requistionName = requistionName || RequisitionConfigName;
  const repo = AppDataSource.getRepository(RequisitionConfig);
  const requisition = await repo.findOneByOrFail({ name: requistionName });

  if (biddingOpen) {
    // bidding from yesterday until tomorrow
    requisition.startOrder = dateDeltaDays(-10);
    requisition.endBiddingRound = dateDeltaDays(10);
    if (increaseOnly) {
      requisition.startBiddingRound = dateDeltaDays(-5);
    } else {
      requisition.startBiddingRound = dateDeltaDays(5);
    }
  } else {
    // bidding round in the past
    requisition.startOrder = dateDeltaDays(-20);
    requisition.endBiddingRound = dateDeltaDays(-10);
    requisition.startBiddingRound = dateDeltaDays(-15);
  }
  await repo.save(requisition);
};

export const dateDeltaDays = (deltaDays: number): Date => {
  return new Date(Date.now() + deltaDays * 24 * 60 * 60 * 1000);
};

export const getDepots = async (): Promise<Depot[]> => {
  return AppDataSource.getRepository(Depot).find();
};

export const getDepotByName = async (name: string): Promise<Depot> => {
  const depots = await getDepots();
  return depots.filter((v) => v.name == name)[0];
};

export const findOrdersByUser = async (userId: number) => {
  const orders = await AppDataSource.getRepository(Order).findBy({
    userId,
  });
  for (const order of orders) {
    const orderItems = await AppDataSource.getRepository(OrderItem).findBy({
      orderId: order.id,
    });
    order.orderItems = orderItems;
  }
  return orders;
};

export const getProductByName = async (name: string): Promise<Product> => {
  return await AppDataSource.getRepository(Product).findOneByOrFail({ name });
};
