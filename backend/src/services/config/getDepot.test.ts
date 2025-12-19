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
  setupDatabaseCleanup,
  testAsAdmin,
  testAsUser1,
} from "../../../testSetup";
import { Depot } from "../../database/Depot";
import { AppDataSource } from "../../database/database";
import { getDepot } from "./getDepot";

setupDatabaseCleanup();

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => getDepot(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent unprivileged access",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token);
    await expect(() => getDepot(ctx)).rejects.toThrowError("Error 403");
  },
);

testAsAdmin("get depots", async ({ userData }: TestUserData) => {
  const ctx = createBasicTestCtx(undefined, userData.token);

  // direct access to depots in the database
  const depotsInDatabase = await AppDataSource.getRepository(Depot).find();
  expect(depotsInDatabase.length).toBeGreaterThan(1);

  // access depots via API
  await getDepot(ctx);
  let depots = ctx.body.depots as Depot[];
  expect(depots).toHaveLength(depotsInDatabase.length);

  // disable a depot
  depotsInDatabase[0].active = false;
  await AppDataSource.getRepository(Depot).save(depotsInDatabase[0]);

  // verify still all depots are returned
  await getDepot(ctx);
  depots = ctx.body.depots as Depot[];
  expect(depots).toHaveLength(depotsInDatabase.length);
  const inactiveDepot = depots.filter(
    (d) => d.id === depotsInDatabase[0].id,
  )[0];
  expect(inactiveDepot.active).toBeFalsy();
});
