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
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { Applicant } from "../../database/Applicant";
import { deactivateApplicant } from "./deactivateApplicant";
import {
  createBasicTestCtx,
  setupDatabaseCleanup,
  testAsAdmin,
  testAsUser1,
  TestUserData,
} from "../../../testSetup";
import {
  createTestApplicant,
  createTestApplicantWithUser,
} from "../../../test/testHelpers";

setupDatabaseCleanup();

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  ctx.params = { id: "1" };
  await expect(() => deactivateApplicant(ctx)).rejects.toThrowError(
    "Error 401",
  );
});

testAsUser1(
  "prevent access for unprivileged user",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token);
    ctx.params = { id: "1" };
    await expect(() => deactivateApplicant(ctx)).rejects.toThrowError(
      "Error 403",
    );
  },
);

testAsAdmin(
  "deactivate applicant and set active=false",
  async ({ userData }: TestUserData) => {
    // Create an active applicant
    const savedApplicant = await createTestApplicant({ active: true });

    // Verify applicant is active
    expect(savedApplicant.active).toBe(true);

    // Deactivate the applicant
    const ctx = createBasicTestCtx(undefined, userData.token);
    ctx.params = { id: savedApplicant.id.toString() };
    await deactivateApplicant(ctx);

    expect(ctx.status).toBe(http.no_content);

    // Verify applicant is now inactive
    const applicantRepo = AppDataSource.getRepository(Applicant);
    const updatedApplicant = await applicantRepo.findOneBy({
      id: savedApplicant.id,
    });
    expect(updatedApplicant).toBeDefined();
    expect(updatedApplicant!.active).toBe(false);
  },
);

testAsAdmin(
  "prevent deactivating non-existent applicant",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token);
    ctx.params = { id: "99999" };
    await expect(() => deactivateApplicant(ctx)).rejects.toThrowError(
      "Error 400",
    );
  },
);

testAsAdmin(
  "prevent deactivating with invalid applicant ID",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token);
    ctx.params = { id: "invalid" };
    await expect(() => deactivateApplicant(ctx)).rejects.toThrowError(
      "Error 400",
    );
  },
);

testAsAdmin(
  "prevent deactivating already converted applicant",
  async ({ userData }: TestUserData) => {
    // Create an applicant that's already converted
    const { applicant: savedApplicant } = await createTestApplicantWithUser({
      active: true,
      userName: "existinguser",
    });

    // Try to deactivate converted applicant
    const ctx = createBasicTestCtx(undefined, userData.token);
    ctx.params = { id: savedApplicant.id.toString() };
    await expect(() => deactivateApplicant(ctx)).rejects.toThrowError(
      "Error 400",
    );

    // Verify applicant is still active
    const applicantRepo = AppDataSource.getRepository(Applicant);
    const existingApplicant = await applicantRepo.findOneBy({
      id: savedApplicant.id,
    });
    expect(existingApplicant).toBeDefined();
    expect(existingApplicant!.active).toBe(true);
  },
);

testAsAdmin(
  "prevent deactivating already inactive applicant",
  async ({ userData }: TestUserData) => {
    // Create an inactive applicant
    const savedApplicant = await createTestApplicant({ active: false });

    // Try to deactivate already inactive applicant
    const ctx = createBasicTestCtx(undefined, userData.token);
    ctx.params = { id: savedApplicant.id.toString() };
    await expect(() => deactivateApplicant(ctx)).rejects.toThrowError(
      "Error 400",
    );

    // Verify applicant is still inactive
    const applicantRepo = AppDataSource.getRepository(Applicant);
    const existingApplicant = await applicantRepo.findOneBy({
      id: savedApplicant.id,
    });
    expect(existingApplicant).toBeDefined();
    expect(existingApplicant!.active).toBe(false);
  },
);
