import { expect, test, vi } from "vitest";
import { PasswordResetService } from "./passwordReset";
import { EmailService, SendEmailRequest } from "../../ports/email";
import { ok, Result } from "neverthrow";
import { InfrastructureError } from "../../error";
import { TextContentRepo } from "../text/repo";
import { UserRepo } from "./repo";
import { User } from "../../database/User";
import { OrganizationInfo } from "@lebenswurzel/solawi-bedarf-shared/src/types";

class MockDependencies implements EmailService, TextContentRepo, UserRepo {
  sendEmail(_: SendEmailRequest): Promise<Result<void, InfrastructureError>> {
    return Promise.resolve(ok());
  }

  findUserByName(_: string): Promise<User | null> {
    return Promise.resolve(null);
  }

  getOrganizationInfo(): Promise<OrganizationInfo> {
    return Promise.resolve(null);
  }

  saveUser(_: User): Promise<void> {
    return Promise.resolve(undefined);
  }
}

const USERNAME = "USERNAME";
const EMAIL = "user@example.org";

test("success", async () => {
  // ARRANGE
  let dependencies = new MockDependencies();
  const mockFindUserByName = vi.spyOn(dependencies, "findUserByName");
  const mockSendEmail = vi.spyOn(dependencies, "sendEmail");
  const mockGetOrganizationInfo = vi.spyOn(dependencies, "getOrganizationInfo");
  const mockSaveUser = vi.spyOn(dependencies, "saveUser");

  let service = new PasswordResetService(dependencies);

  // ACT
  const result = await service.beginPasswordReset(USERNAME, EMAIL);

  // ASSERT
  expect(result).toEqual(ok());
});
