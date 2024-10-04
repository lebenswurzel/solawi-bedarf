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
import { ConfigResponse } from "../../../../shared/src/types";
import {
  TestUserData,
  createBasicTestCtx,
  testAsUser1,
} from "../../../testSetup";
import {
  RequisitionConfig,
  RequisitionConfigName,
} from "../../database/RequisitionConfig";
import { AppDataSource } from "../../database/database";
import { getConfig } from "./getConfig";

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

const getConfigByName = async (name: string): Promise<RequisitionConfig> => {
  return await AppDataSource.getRepository(RequisitionConfig).findOneByOrFail({
    name,
  });
};
