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
import {
  createBasicTestCtx,
  setupDatabaseCleanup,
  TestAdminAndUserData,
  testAsAdmin,
  testAsAdminAndUser,
  testAsUser1,
  TestUserData,
} from "../../../testSetup";
import { updateUser } from "./updateUser";
import { UpdateUserRequest } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { AppDataSource } from "../../database/database";
import { getRequisitionConfigId } from "../../../test/testHelpers";
import { Order } from "../../database/Order";

setupDatabaseCleanup();

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => updateUser(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent access for unprivileged user",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: userData.userId,
    });
    await expect(() => updateUser(ctx)).rejects.toThrowError("Error 403");
  },
);

testAsAdmin("missing user id", async ({ userData }: TestUserData) => {
  const ctx = createBasicTestCtx({}, userData.token);
  await expect(() => updateUser(ctx)).rejects.toThrowError("Error 400");
});

testAsAdmin("missing or wrong user id", async ({ userData }: TestUserData) => {
  let ctx = createBasicTestCtx({}, userData.token);
  await expect(() => updateUser(ctx)).rejects.toThrowError("Error 400");

  ctx = createBasicTestCtx(
    {
      id: -1,
    },
    userData.token,
  );
  await expect(() => updateUser(ctx)).rejects.toThrowError("Error 404");
});

testAsAdminAndUser(
  "set user inactive and active",
  async ({ userData }: TestAdminAndUserData) => {
    // test setting inactive
    const ctx = createBasicTestCtx(
      {
        id: userData.userId,
        active: false,
        configId: await getRequisitionConfigId(),
      } as UpdateUserRequest,
      userData.adminToken,
    );
    const userBefore = await AppDataSource.getRepository(
      "User",
    ).findOneByOrFail({
      id: userData.userId,
    });
    expect(userBefore.active).toBe(true);
    await updateUser(ctx);
    const userAfter = await AppDataSource.getRepository("User").findOneByOrFail(
      {
        id: userData.userId,
      },
    );
    expect(userAfter.active).toBe(false);

    // test setting active again
    ctx.request.body = {
      id: userData.userId,
      active: true,
      configId: await getRequisitionConfigId(),
    } as UpdateUserRequest;
    await updateUser(ctx);
    const userAfter2 = await AppDataSource.getRepository(
      "User",
    ).findOneByOrFail({
      id: userData.userId,
    });
  },
);

testAsAdminAndUser(
  "set order valid from",
  async ({ userData }: TestAdminAndUserData) => {
    const validFromDate = new Date();

    const ctx = createBasicTestCtx(
      {
        id: userData.userId,
        orderValidFrom: validFromDate,
        configId: await getRequisitionConfigId(),
      },
      userData.adminToken,
    );
    await updateUser(ctx);

    // validate date of order
    const order = await AppDataSource.getRepository(Order).findOneByOrFail({
      userId: userData.userId,
      requisitionConfigId: await getRequisitionConfigId(),
    });
    expect(order.validFrom).toEqual(validFromDate);

    // update order to be valid 1000 s from now
    const ctx2 = createBasicTestCtx(
      {
        id: userData.userId,
        orderValidFrom: new Date(validFromDate.getTime() + 1000000),
        configId: await getRequisitionConfigId(),
      },
      userData.adminToken,
    );
    await updateUser(ctx2);

    // validate date of order
    const order2 = await AppDataSource.getRepository(Order).findOneByOrFail({
      userId: userData.userId,
      requisitionConfigId: await getRequisitionConfigId(),
    });
    expect(order2.validFrom).toEqual(
      new Date(validFromDate.getTime() + 1000000),
    );
    // validate that updatedAt has not changed
    expect(order2.updatedAt).toEqual(order.updatedAt);
  },
);
