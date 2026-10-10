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
import { expect } from "vitest";
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { SaveUserRequest } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import {
  createBasicTestCtx,
  loginUser,
  setupDatabaseCleanup,
  TestAdminAndUserData,
  testAsAdminAndUser,
} from "../../../testSetup";
import { AppDataSource } from "../../database/database";
import { Order } from "../../database/Order";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { User } from "../../database/User";
import { comparePassword } from "../../security";
import {
  dateDeltaDays,
  findOrdersByUser,
  getDepotByName,
  getRequisitionConfigId,
} from "../../../test/testHelpers";
import { saveUser } from "./saveUser";

setupDatabaseCleanup();

const validFromTimes = (orders: Order[]) =>
  orders.map((order) => order.validFrom.getTime()).sort((a, b) => a - b);

const createOrder = async (
  userId: number,
  config: RequisitionConfig,
  validFrom: Date,
  validTo: Date,
) => {
  const depot = await getDepotByName("d1");
  const order = new Order();
  order.userId = userId;
  order.requisitionConfigId = config.id;
  order.validFrom = validFrom;
  order.validTo = validTo;
  order.offer = 0;
  order.category = UserCategory.CAT100;
  order.depotId = depot.id;
  order.confirmGTC = true;
  return AppDataSource.getRepository(Order).save(order);
};

testAsAdminAndUser(
  "saves a password when the echoed validFrom already belongs to one of several orders",
  async ({ userData }: TestAdminAndUserData) => {
    const config = await AppDataSource.getRepository(
      RequisitionConfig,
    ).findOneByOrFail({
      id: await getRequisitionConfigId(),
    });
    await createOrder(
      userData.userId,
      config,
      dateDeltaDays(-40),
      dateDeltaDays(-10),
    );
    await createOrder(
      userData.userId,
      config,
      dateDeltaDays(-10),
      config.validTo,
    );

    const user = await AppDataSource.getRepository(User).findOneByOrFail({
      id: userData.userId,
    });
    const ordersBefore = await findOrdersByUser(userData.userId);
    expect(ordersBefore).toHaveLength(2);
    const echoedValidFrom = ordersBefore[0].validFrom;

    const ctx = createBasicTestCtx(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        active: user.active,
        password: "NewSecret1",
        orderValidFrom: echoedValidFrom,
        requisitionConfigId: config.id,
      } as SaveUserRequest,
      userData.adminToken,
    );
    await saveUser(ctx);
    expect(ctx.status).toBe(204);

    const savedUser = await AppDataSource.getRepository(User).findOneByOrFail({
      id: user.id,
    });
    expect(await comparePassword("NewSecret1", savedUser.hash)).toBe(true);
    expect(validFromTimes(await findOrdersByUser(user.id))).toEqual(
      validFromTimes(ordersBefore),
    );

    const token = await loginUser(user.name, "NewSecret1");
    expect(token).toEqual(expect.any(String));
    expect(token.length).toBeGreaterThan(0);

    const changedValidFrom = new Date(
      echoedValidFrom.getTime() + 60 * 60 * 1000,
    );
    const failingCtx = createBasicTestCtx(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        active: user.active,
        password: "OtherSecret2",
        orderValidFrom: changedValidFrom,
        requisitionConfigId: config.id,
      } as SaveUserRequest,
      userData.adminToken,
    );
    await expect(() => saveUser(failingCtx)).rejects.toThrowError(
      /Multiple orders found/,
    );

    const userAfterRejectedDate = await AppDataSource.getRepository(
      User,
    ).findOneByOrFail({
      id: user.id,
    });
    expect(
      await comparePassword("OtherSecret2", userAfterRejectedDate.hash),
    ).toBe(true);
    expect(validFromTimes(await findOrdersByUser(user.id))).toEqual(
      validFromTimes(ordersBefore),
    );
  },
);
