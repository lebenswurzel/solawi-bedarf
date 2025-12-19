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
import { saveApplicant } from "./saveApplicant";
import { createBasicTestCtx, setupDatabaseCleanup } from "../../../testSetup";
import { createTestApplicant } from "../../../test/testHelpers";

setupDatabaseCleanup();

test("create applicant with active=true", async () => {
  const requestBody = {
    confirmGDPR: true,
    comment: "Test comment",
    password: "testpassword123",
    address: {
      firstname: "John",
      lastname: "Doe",
      password: "testpassword123",
      email: "john.doe@example.com",
      phone: "+49123456789",
      street: "Test Street 123",
      postalcode: "12345",
      city: "Test City",
    },
  };

  const ctx = createBasicTestCtx(requestBody);
  await saveApplicant(ctx);

  expect(ctx.status).toBe(http.created);

  // Verify applicant was created with active=true
  const applicants = await AppDataSource.getRepository(Applicant).find({
    where: { active: true },
    relations: { address: true },
  });

  const createdApplicant = applicants.find(
    (a) =>
      a.address &&
      JSON.parse(a.address.address).email === "john.doe@example.com",
  );
  expect(createdApplicant).toBeDefined();
  expect(createdApplicant!.active).toBe(true);
  expect(createdApplicant!.confirmGDPR).toBe(true);
  expect(createdApplicant!.comment).toBe("Test comment");
  expect(createdApplicant!.address).toBeDefined();

  // Verify address was created
  const address = createdApplicant!.address;
  expect(address).toBeDefined();
  expect(address.active).toBe(false);

  const addressData = JSON.parse(address.address);
  expect(addressData.firstname).toBe("John");
  expect(addressData.lastname).toBe("Doe");
  expect(addressData.email).toBe("john.doe@example.com");
  expect(addressData.phone).toBe("+49123456789");
  expect(addressData.street).toBe("Test Street 123");
  expect(addressData.postalcode).toBe("12345");
  expect(addressData.city).toBe("Test City");
});

test("prevent creating applicant without GDPR confirmation", async () => {
  // Count applicants before
  const countBefore = await AppDataSource.getRepository(Applicant).count();

  const requestBody = {
    confirmGDPR: false,
    comment: "Test comment no GDPR",
    password: "testpassword123",
    address: {
      firstname: "John",
      lastname: "Doe",
      password: "testpassword123",
      email: "no.gdpr@example.com",
      phone: "+49123456789",
      street: "Test Street 123",
      postalcode: "12345",
      city: "Test City",
    },
  };

  const ctx = createBasicTestCtx(requestBody);
  await expect(() => saveApplicant(ctx)).rejects.toThrowError("Error 400");

  // Verify no applicant was created - count should be the same
  const countAfter = await AppDataSource.getRepository(Applicant).count();
  expect(countAfter).toBe(countBefore);

  // Also verify no applicant with this email exists
  const applicants = await AppDataSource.getRepository(Applicant).find({
    relations: { address: true },
  });
  const createdApplicant = applicants.find((a) => {
    if (a.address) {
      const addressData = JSON.parse(a.address.address);
      return addressData.email === "no.gdpr@example.com";
    }
    return false;
  });
  expect(createdApplicant).toBeUndefined();
});

test("prevent creating applicant with missing required fields", async () => {
  const requestBody = {
    confirmGDPR: true,
    comment: "",
    password: "testpassword123",
    address: {
      firstname: "John",
      lastname: "Doe",
      password: "testpassword123",
      email: "john.doe@example.com",
      phone: "+49123456789",
      street: "Test Street 123",
      postalcode: "12345",
      city: "Test City",
    },
  };

  const ctx = createBasicTestCtx(requestBody);
  await expect(() => saveApplicant(ctx)).rejects.toThrowError("Error 400");

  // Test missing email
  const requestBody2 = {
    confirmGDPR: true,
    comment: "Test comment",
    password: "testpassword123",
    address: {
      firstname: "John",
      lastname: "Doe",
      password: "testpassword123",
      email: "",
      phone: "+49123456789",
      street: "Test Street 123",
      postalcode: "12345",
      city: "Test City",
    },
  };

  const ctx2 = createBasicTestCtx(requestBody2);
  await expect(() => saveApplicant(ctx2)).rejects.toThrowError("Error 400");
});

test("prevent creating applicant when active limit is reached", async () => {
  // Check current count of active applicants
  const initialCount = await AppDataSource.getRepository(Applicant).count({
    where: { active: true },
  });

  // Create enough applicants to reach 201 active (limit is > 200, so 201 should be rejected)
  const targetCount = 201;
  const toCreate = targetCount - initialCount;

  for (let i = 0; i < toCreate; i++) {
    await createTestApplicant({
      active: true,
      comment: `Test comment limit ${i}`,
      addressData: {
        firstname: `Test${i}`,
        lastname: "User",
        email: `testlimit${i}@example.com`,
      },
    });
  }

  // Verify we have 201 active applicants
  const countAfter = await AppDataSource.getRepository(Applicant).count({
    where: { active: true },
  });
  expect(countAfter).toBe(targetCount);

  // Try to create one more applicant - should fail
  const requestBody = {
    confirmGDPR: true,
    comment: "Test comment limit exceeded",
    password: "testpassword123",
    address: {
      firstname: "John",
      lastname: "Doe",
      password: "testpassword123",
      email: "limit.exceeded@example.com",
      phone: "+49123456789",
      street: "Test Street 123",
      postalcode: "12345",
      city: "Test City",
    },
  };

  const ctx = createBasicTestCtx(requestBody);
  await expect(() => saveApplicant(ctx)).rejects.toThrowError("Error 400");

  // Verify no new applicant was created
  const finalCount = await AppDataSource.getRepository(Applicant).count({
    where: { active: true },
  });
  expect(finalCount).toBe(targetCount);
});
