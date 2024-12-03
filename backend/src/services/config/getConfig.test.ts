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
  ConfigResponse,
  ConfirmedOrder,
  CreateConfigRequest,
  NewConfig,
} from "../../../../shared/src/types";
import {
  TestAdminAndUserData,
  TestUserData,
  createBasicTestCtx,
  testAsAdmin,
  testAsAdminAndUser,
  testAsUser1,
} from "../../../testSetup";
import {
  RequisitionConfig,
  RequisitionConfigName,
} from "../../database/RequisitionConfig";
import { AppDataSource } from "../../database/database";
import { getConfig } from "./getConfig";
import { createConfig } from "./createConfig";
import { getDepotByName } from "../../../test/testHelpers";
import { UserCategory } from "../../../../shared/src/enum";
import { saveOrder } from "../order/saveOrder";
import { Order } from "../../database/Order";

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => getConfig(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1("get config", async ({ userData }: TestUserData) => {
  const originalConfig = await getConfigByName(RequisitionConfigName);

  // check config without id
  const ctxNoId = createBasicTestCtx(undefined, userData.token);
  await getConfig(ctxNoId);
  const response = ctxNoId.body as ConfigResponse;
  expect(response.config).toMatchObject(
    await getConfigByName(RequisitionConfigName),
  );
  expect(response.config).toMatchObject(originalConfig);

  // check config with id
  const ctxWithId = createBasicTestCtx(undefined, userData.token, undefined, {
    id: originalConfig.id,
  });
  await getConfig(ctxWithId);
  const response2 = ctxWithId.body as ConfigResponse;
  expect(response2.config).toMatchObject(
    await getConfigByName(RequisitionConfigName),
  );
  expect(response.config).toMatchObject(originalConfig);

  // check config with wrong id
  const ctxWithWrongId = createBasicTestCtx(
    undefined,
    userData.token,
    undefined,
    {
      configId: originalConfig.id - 1,
    },
  );
  await expect(() => getConfig(ctxWithWrongId)).rejects.toThrowError(
    "Error 404",
  );
});

testAsAdminAndUser(
  "get default config",
  async ({ userData }: TestAdminAndUserData) => {
    // disable original config
    const originalConfig = await getConfigByName(RequisitionConfigName);
    originalConfig.public = false;
    await AppDataSource.getRepository(RequisitionConfig).save(originalConfig);

    // create two for testing
    const season1 = await _createConfig(
      userData.adminToken,
      "Season1",
      2001,
      originalConfig.id,
    );
    const season2 = await _createConfig(
      userData.adminToken,
      "Season2",
      2002,
      originalConfig.id,
    );

    const ctxNoId = createBasicTestCtx(undefined, userData.userToken);
    await getConfig(ctxNoId);
    const response = ctxNoId.body as ConfigResponse;

    // no order was placed --> return the latest season
    expect(response.config).toMatchObject(season2);

    // create an order in season1
    await _createOrder(userData.userToken, userData.userId, season1.id);

    // return season1
    const ctxNoId2 = createBasicTestCtx(undefined, userData.userToken);
    await getConfig(ctxNoId2);
    expect(ctxNoId2.body.config).toMatchObject(season1);
  },
);

const getConfigByName = async (name: string): Promise<RequisitionConfig> => {
  return await AppDataSource.getRepository(RequisitionConfig).findOneByOrFail({
    name,
  });
};

const _createConfig = async (
  token: string,
  name: string,
  year: number,
  originalConfigId: number,
) => {
  const newConfig: NewConfig = {
    name,
    budget: 999,
    startOrder: new Date("" + year + "-11-01"),
    startBiddingRound: new Date("" + year + "-12-01"),
    endBiddingRound: new Date("" + (year + 1) + "-01-01"),
    validFrom: new Date("" + (year + 1) + "-04-01"),
    validTo: new Date("" + (year + 2) + "-04-01"),
    public: true,
  };

  const ctxNewConfig = createBasicTestCtx<CreateConfigRequest>(
    { config: newConfig, copyFrom: originalConfigId },
    token,
  );
  await createConfig(ctxNewConfig);
  return await getConfigByName(name);
};

const _createOrder = async (
  token: string,
  userId: number,
  configId: number,
) => {
  const depot = await getDepotByName("d1");
  const order = {
    category: UserCategory.CAT100,
    categoryReason: "nothing special",
    depotId: depot.id,
    orderItems: [],
    offer: 0,
    alternateDepotId: null,
    offerReason: null,
    validFrom: null,
    requisitionConfigId: configId,
    productConfiguration: "{}",
    userId,
  };

  // create order
  await AppDataSource.getRepository(Order).save(order);
};
