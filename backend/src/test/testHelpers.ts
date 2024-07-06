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
  RequisitionConfig,
  RequisitionConfigName,
} from "../database/RequisitionConfig";
import { AppDataSource } from "../database/database";
import { createBasicTestCtx } from "../../testSetup";
import { saveDepot } from "../services/config/saveDepot";
import { Depot } from "../database/Depot";
import { Order } from "../database/Order";

export const fillDatabaseWithTestData = async (adminToken: string) => {
  const products = ["p1", "p2", "p3", "p4"];
  const depots = ["d1", "d2", "d3"];

  await depots.forEach(async (name) => await createTestDepot(name, adminToken));
};

const createTestDepot = async (name: string, adminToken: string) => {
  const ctx = createBasicTestCtx(
    {
      name,
      address: `${name} address`,
      openingHours: "9-5",
      capacity: 12,
      active: true,
    },
    adminToken,
  );
  await saveDepot(ctx);
};

export const updateRequisition = async (
  biddingOpen: boolean,
  requistionName?: string,
) => {
  const now = new Date();
  requistionName = requistionName || RequisitionConfigName;
  const repo = AppDataSource.getRepository(RequisitionConfig);
  const requisition = await repo.findOneByOrFail({ name: requistionName });

  if (biddingOpen) {
    // bidding from yesterday until tomorrow
    requisition.startOrder = dateDeltaDays(-1);
    requisition.endBiddingRound = dateDeltaDays(1);
  } else {
    // bidding round in the past
    requisition.startOrder = dateDeltaDays(-2);
    requisition.endBiddingRound = dateDeltaDays(-1);
  }
  await repo.save(requisition);
};

const dateDeltaDays = (deltaDays: number): Date => {
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
  return await AppDataSource.getRepository(Order).findBy({
    userId,
  });
};
