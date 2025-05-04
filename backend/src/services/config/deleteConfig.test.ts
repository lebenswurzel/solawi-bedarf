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
  TestUserData,
  createBasicTestCtx,
  testAsAdmin,
  testAsUser1,
} from "../../../testSetup";
import { http } from "../../consts/http";
import {
  RequisitionConfig,
  RequisitionConfigName,
} from "../../database/RequisitionConfig";
import { AppDataSource } from "../../database/database";
import { deleteConfig } from "./deleteConfig";
import { createConfig } from "./createConfig";
import {
  CreateConfigRequest,
  NewConfig,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => deleteConfig(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent unprivileged access",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token);
    await expect(() => deleteConfig(ctx)).rejects.toThrowError("Error 403");
  },
);

testAsAdmin(
  "prevent deleting config with products",
  async ({ userData }: TestUserData) => {
    const originalConfig = await getConfigByName(RequisitionConfigName);
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      configId: originalConfig.id,
    });

    await expect(() => deleteConfig(ctx)).rejects.toThrowError("Error 405");

    // original config unchanged
    const stillOriginalConfig = await getConfigByName(RequisitionConfigName);
    expect(stillOriginalConfig).toMatchObject(originalConfig);
  },
);

testAsAdmin("delete unused config", async ({ userData }: TestUserData) => {
  // add a new config
  const newConfig: NewConfig = {
    name: "config no.1",
    budget: 12345,
    startOrder: new Date("2000-11-01"),
    startBiddingRound: new Date("2000-12-01"),
    endBiddingRound: new Date("2001-01-01"),
    validFrom: new Date("2001-04-01"),
    validTo: new Date("2002-04-01"),
    public: true,
  };

  const ctxNewConfig = createBasicTestCtx<CreateConfigRequest>(
    { config: newConfig, copyFrom: undefined },
    userData.token,
  );
  await createConfig(ctxNewConfig);
  expect(ctxNewConfig.status).toBe(http.created);

  const newConfigFromDb = await getConfigByName("config no.1");
  const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
    configId: newConfigFromDb.id,
  });

  // delete t
  await deleteConfig(ctx);
  expect(ctx.status).toBe(http.no_content);

  // it's gone
  await expect(() => getConfigByName("config no.1")).rejects.toThrowError(
    "Could not find any entity",
  );
});

const getConfigByName = async (name: string): Promise<RequisitionConfig> => {
  return await AppDataSource.getRepository(RequisitionConfig).findOneByOrFail({
    name,
  });
};
