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
import {
  ProductCategoryType,
  Unit,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { Depot } from "../src/database/Depot";
import { Order } from "../src/database/Order";
import { OrderItem } from "../src/database/OrderItem";
import { Product } from "../src/database/Product";
import { ProductCategory } from "../src/database/ProductCategory";
import {
  RequisitionConfig,
  RequisitionConfigName,
} from "../src/database/RequisitionConfig";
import { AppDataSource } from "../src/database/database";

export const fillDatabaseWithTestData = async () => {
  const products = ["p1", "p2", "p3", "p4"];
  const depots = ["d1", "d2", "d3"];

  let rank = 1;
  for (const depot of depots) {
    await createTestDepot(depot, rank++);
  }
  for (const product of products) {
    await createTestProduct(product);
  }
};

const createTestDepot = async (name: string, rank: number) => {
  AppDataSource.getRepository(Depot).save({
    name,
    address: `${name} address`,
    openingHours: "9-5",
    capacity: 12,
    active: true,
    rank,
  });
};

export const createTestProductCategory = async (name: string) => {
  const requisitionConfig = await AppDataSource.getRepository(
    RequisitionConfig,
  ).findOneOrFail({ where: { name: RequisitionConfigName } });
  const pcEntity = await AppDataSource.getRepository(ProductCategory).save({
    name,
    active: true,
    requisitionConfig,
    typ: ProductCategoryType.SELFGROWN,
  });
  return pcEntity;
};

const createTestProduct = async (name: string) => {
  const pcEntity = await createTestProductCategory(`${name} category`);
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

export const getRequisitionConfigId = async (): Promise<number> => {
  return (
    await AppDataSource.getRepository(RequisitionConfig).findOneOrFail({
      where: { name: RequisitionConfigName },
    })
  ).id;
};

export const updateRequisition = async (
  biddingOpen: boolean,
  increaseOnly?: boolean,
  requistionName?: string,
): Promise<number> => {
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
    requisition.validFrom = dateDeltaDays(20);
    requisition.validTo = dateDeltaDays(20 + 365);
  } else {
    // bidding round in the past
    requisition.startOrder = dateDeltaDays(-20);
    requisition.startBiddingRound = dateDeltaDays(-15);
    requisition.endBiddingRound = dateDeltaDays(-10);

    // season is currently active
    requisition.validFrom = dateDeltaDays(-5);
    requisition.validTo = dateDeltaDays(-5 + 365);
  }
  await repo.save(requisition);
  return requisition.id;
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
