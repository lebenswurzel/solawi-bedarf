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
  RequisitionConfig as RequisitionConfigType,
} from "../../../../shared/src/types";
import {
  TestUserData,
  createBasicTestCtx,
  testAsAdmin,
  testAsUser1,
} from "../../../testSetup";
import {
  RequisitionConfig,
  RequisitionConfigName,
} from "../../database/RequisitionConfig";
import { AppDataSource } from "../../database/database";
import { getConfig } from "./getConfig";
import { saveConfig } from "./saveConfig";

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => saveConfig(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent unprivileged access",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token);
    await expect(() => saveConfig(ctx)).rejects.toThrowError("Error 403");
  },
);

testAsAdmin("get and change config", async ({ userData }: TestUserData) => {
  const originalConfig = await getConfigByName(RequisitionConfigName);
  const ctxGetConfig = createBasicTestCtx(
    undefined,
    userData.token,
    undefined,
    { id: originalConfig.id },
  );

  // check default config
  await getConfig(ctxGetConfig);
  const response = ctxGetConfig.body as ConfigResponse;
  expect(response.config).toMatchObject(
    await getConfigByName(RequisitionConfigName),
  );

  const updatedConfig: RequisitionConfigType = {
    id: response.config.id,
    name: "new name",
    budget: 123,
    startOrder: new Date("1999-11-01"),
    startBiddingRound: new Date("1999-12-01"),
    endBiddingRound: new Date("2000-01-01"),
    validFrom: new Date("2000-04-01"),
    validTo: new Date("2001-04-01"),
  };

  const ctxUpdate1 = createBasicTestCtx(updatedConfig, userData.token);
  await saveConfig(ctxUpdate1);

  await getConfig(ctxGetConfig);
  const response2 = ctxGetConfig.body as ConfigResponse;

  expect(response2.config).toMatchObject(updatedConfig);
  const configFromDb = await getConfigByName("new name");
  expect(response2.config).toMatchObject(configFromDb);
});

const getConfigByName = async (name: string): Promise<RequisitionConfig> => {
  return await AppDataSource.getRepository(RequisitionConfig).findOneByOrFail({
    name,
  });
};

testAsAdmin("TODO add more configs", async ({ userData }: TestUserData) => {});
