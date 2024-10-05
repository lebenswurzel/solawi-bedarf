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
  CreateConfigRequest,
  ExistingConfig,
  NewConfig,
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
import { http } from "../../consts/http";
import { createConfig } from "./createConfig";

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

  const updatedConfig: ExistingConfig = {
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
  expect(ctxUpdate1.status).toBe(http.no_content);

  await getConfig(ctxGetConfig);
  const response2 = ctxGetConfig.body as ConfigResponse;

  expect(response2.config).toMatchObject(updatedConfig);
  const configFromDb = await getConfigByName("new name");
  expect(response2.config).toMatchObject(configFromDb);
});

testAsAdmin("add more configs", async ({ userData }: TestUserData) => {
  const newConfig: NewConfig = {
    name: "config no.1",
    budget: 12345,
    startOrder: new Date("2000-11-01"),
    startBiddingRound: new Date("2000-12-01"),
    endBiddingRound: new Date("2001-01-01"),
    validFrom: new Date("2001-04-01"),
    validTo: new Date("2002-04-01"),
  };

  const ctxNewConfig = createBasicTestCtx<CreateConfigRequest>(
    { config: newConfig, copyFrom: undefined },
    userData.token,
  );
  await createConfig(ctxNewConfig);
  expect(ctxNewConfig.status).toBe(http.created);

  const newConfigFromDb = await getConfigByName("config no.1");
  expect(newConfigFromDb).toMatchObject(newConfig);

  const originalConfig = await getConfigByName(RequisitionConfigName);
  expect(newConfigFromDb.id).not.toEqual(originalConfig.id);

  const newConfig2: NewConfig = {
    name: "config no.2",
    budget: 999,
    startOrder: new Date("2001-11-01"),
    startBiddingRound: new Date("2000-12-01"),
    endBiddingRound: new Date("2002-01-01"),
    validFrom: new Date("2002-04-01"),
    validTo: new Date("2003-04-01"),
  };

  const ctxNewConfig2 = createBasicTestCtx<CreateConfigRequest>(
    { config: newConfig2, copyFrom: undefined },
    userData.token,
  );
  await createConfig(ctxNewConfig2);
  expect(ctxNewConfig2.status).toBe(http.created);
  expect(await AppDataSource.getRepository(RequisitionConfig).count()).toBe(3);
  const newConfig2FromDb = await getConfigByName("config no.2");
  expect(newConfig2FromDb).toMatchObject(newConfig2);

  // disallow configs with same name
  const newConfigBad: NewConfig = {
    name: "config no.2",
    budget: 100,
    startOrder: new Date("2001-11-01"),
    startBiddingRound: new Date("2000-12-01"),
    endBiddingRound: new Date("2002-01-01"),
    validFrom: new Date("2002-04-01"),
    validTo: new Date("2003-04-01"),
  };
  const ctxNewConfigBad = createBasicTestCtx(newConfigBad, userData.token);
  await expect(() => saveConfig(ctxNewConfigBad)).rejects.toThrowError(
    "duplicate key value violates unique constraint",
  );
  const stillConfig2 = await getConfigByName("config no.2");
  expect(stillConfig2).toMatchObject(newConfig2);

  // disallow renaming to existing name
  const newConfig2_renamed: ExistingConfig = {
    ...newConfig2,
    id: newConfig2FromDb.id,
    name: "config no.1",
  };
  const ctxNewConfig2_renamed = createBasicTestCtx(
    newConfig2_renamed,
    userData.token,
  );
  await expect(() => saveConfig(ctxNewConfig2_renamed)).rejects.toThrowError(
    "duplicate key value violates unique constraint",
  );

  // get all existing configs
  const ctxGetConfig = createBasicTestCtx(undefined, userData.token);
  await getConfig(ctxGetConfig);
  const response = ctxGetConfig.body as ConfigResponse;

  expect(response.availableConfigs).toMatchObject([
    {
      id: newConfigFromDb.id,
      name: "config no.1",
    },
    {
      id: newConfig2FromDb.id,
      name: "config no.2",
    },
    {
      id: originalConfig.id,
      name: "Saison 24/25",
    },
  ]);
});

const getConfigByName = async (name: string): Promise<RequisitionConfig> => {
  return await AppDataSource.getRepository(RequisitionConfig).findOneByOrFail({
    name,
  });
};
